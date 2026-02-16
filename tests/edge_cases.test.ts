import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { rm, mv, inspect, pullLocal, list, pushGlobal, installSkill, scaffold, group } from '../src/ctl';
import { resolveCommand } from '../src/resolve';
import { readManifest } from '../src/manifest';
import { getGlobalRoot, getAntigravityGlobalRoot } from '../src/fs-utils';
import * as fsUtils from '../src/fs-utils';
import { SUPPORTED_AGENTS, copySkill } from '../src/skills';

describe('edge cases for 100% coverage', () => {
    const tmpDir = path.join(os.tmpdir(), 'agentctl-coverage-tests');
    const localDir = path.join(tmpDir, 'local');
    const globalDir = path.join(tmpDir, 'global');

    beforeEach(async () => {
        await fs.ensureDir(localDir);
        await fs.ensureDir(globalDir);
        await fs.ensureDir(path.join(localDir, '.agentctl'));
    });

    afterEach(async () => {
        await fs.remove(tmpDir);
    });

    it('covers getAntigravityGlobalRoot', () => {
        const root = getAntigravityGlobalRoot();
        expect(root).toContain('.gemini');
        expect(root).toContain('antigravity');
    });

    it('covers non-win32 getGlobalRoot', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'linux' });
        const root = getGlobalRoot();
        expect(root).toContain('.config');
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('covers win32 getGlobalRoot without APPDATA', () => {
        if (process.platform !== 'win32') return;
        const originalAppData = process.env.APPDATA;
        delete process.env.APPDATA;
        const root = getGlobalRoot();
        expect(root).toContain('AppData');
        process.env.APPDATA = originalAppData;
    });

    it('covers readManifest failure (corrupt JSON)', async () => {
        const p = path.join(tmpDir, 'corrupt.json');
        await fs.writeFile(p, '{ invalid json }');
        const m = await readManifest(p);
        expect(m).toBeNull();
    });

    it('covers rm failure (command not found)', async () => {
        await expect(rm(['notfound'], { cwd: localDir, globalDir })).rejects.toThrow('Command notfound not found');
    });

    it('covers mv failure (command not found)', async () => {
        await expect(mv(['notfound'], ['dest'], { cwd: localDir, globalDir })).rejects.toThrow('Command notfound not found');
    });

    it('covers inspect failure (command not found)', async () => {
        const result = await inspect(['notfound'], { cwd: localDir, globalDir });
        expect(result).toBeNull();
    });

    it('covers pullLocal copy (not move)', async () => {
        const cmdDir = path.join(globalDir, 'cmd');
        await fs.ensureDir(cmdDir);
        await fs.writeJson(path.join(cmdDir, 'manifest.json'), { name: 'cmd', type: 'scaffold' });

        await pullLocal(['cmd'], { cwd: localDir, globalDir, copy: true });

        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'cmd'))).toBe(true);
        expect(await fs.pathExists(path.join(globalDir, 'cmd'))).toBe(true);
    });

    it('covers implicit global group and group-winning-over-capped shadowing', async () => {
        // Global has a capped command "work"
        const globalWork = path.join(globalDir, 'work');
        await fs.ensureDir(globalWork);
        await fs.writeJson(path.join(globalWork, 'manifest.json'), { name: 'work', run: 'echo global' });

        // Local has a group "work" (implicit)
        const localWork = path.join(localDir, '.agentctl', 'work');
        await fs.ensureDir(localWork);

        // Global has an implicit group "other"
        const globalOther = path.join(globalDir, 'other');
        await fs.ensureDir(globalOther);

        const resWork = await resolveCommand(['work'], { cwd: localDir, globalDir });
        expect(resWork?.scope).toBe('local');
        expect(resWork?.manifest.type).toBe('group');

        const resOther = await resolveCommand(['other'], { cwd: localDir, globalDir });
        expect(resOther?.scope).toBe('global');
        expect(resOther?.manifest.type).toBe('group');
    });

    it('covers list with manifest type logic and corrupt manifest', async () => {
        const localWork = path.join(localDir, '.agentctl', 'work');
        await fs.ensureDir(localWork);
        // Type provided in manifest, but not capped
        await fs.writeJson(path.join(localWork, 'manifest.json'), { name: 'work', type: 'group' });

        const corruptCmd = path.join(localDir, '.agentctl', 'corrupt');
        await fs.ensureDir(corruptCmd);
        await fs.writeFile(path.join(corruptCmd, 'manifest.json'), '{ bad json }');

        const cmds = await list({ cwd: localDir, globalDir });
        const work = cmds.find(c => c.path === 'work');
        expect(work?.type).toBe('group');

        const corrupt = cmds.find(c => c.path === 'corrupt');
        expect(corrupt?.type).toBe('group'); // Falls back to group on corrupt json
    });

    it('covers isCapped failure in prepareCommand', async () => {
        const cappedDir = path.join(localDir, '.agentctl', 'capped');
        await fs.ensureDir(cappedDir);
        await fs.writeFile(path.join(cappedDir, 'manifest.json'), '{ bad json }');

        // scaffold will call prepareCommand, which calls isCapped on parent dirs
        await scaffold(['capped', 'sub'], { cwd: localDir });

        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'capped', 'sub'))).toBe(true);
    });

    it('covers list stat failure', async () => {
        const originalStat = (await import('fs-extra')).default.stat;
        const spy = vi.spyOn(fs, 'stat').mockImplementation(async (p: fs.PathLike) => {
            if (p.toString().includes('failme')) {
                throw new Error('stat error');
            }
            return originalStat(p);
        });

        const failDir = path.join(globalDir, 'failme');
        await fs.ensureDir(failDir);

        const cmds = await list({ cwd: localDir, globalDir });
        expect(cmds.find(c => c.path === 'failme')).toBeUndefined();

        spy.mockRestore();
    });

    it('covers default options in pushGlobal and pullLocal', async () => {
        // Need to be in a local root for these to not throw
        const originalCwd = process.cwd();
        process.chdir(localDir);
        try {
            await expect(pushGlobal(['notfound'])).rejects.toThrow('Local command notfound not found');
            await expect(pullLocal(['notfound'])).rejects.toThrow('Global command notfound not found');
        } finally {
            process.chdir(originalCwd);
        }
    });

    it('covers installSkill errors and agents', async () => {
        // We already have a test for supported agents but let's hit the ctl branch
        await expect(installSkill('unknown', { cwd: localDir })).rejects.toThrow('Agent \'unknown\' not supported');

        await installSkill('antigravity', { cwd: localDir });
        expect(await fs.pathExists(path.join(localDir, '.agent', 'skills', 'agentctl', 'SKILL.md'))).toBe(true);

        const fakeGlobal = path.join(tmpDir, 'fakeGlobal');
        await installSkill('antigravity', { global: true, antigravityGlobalDir: fakeGlobal });
        expect(await fs.pathExists(path.join(fakeGlobal, 'skills', 'agentctl', 'SKILL.md'))).toBe(true);

        await installSkill('cursor', { cwd: localDir });
        expect(await fs.pathExists(path.join(localDir, '.cursor', 'skills', 'agentctl.md'))).toBe(true);
    });

    it('covers mv in global scope', async () => {
        const globalSrc = path.join(globalDir, 'src');
        await fs.ensureDir(globalSrc);
        await fs.writeJson(path.join(globalSrc, 'manifest.json'), { name: 'src', type: 'scaffold' });

        await mv(['src'], ['dest'], { globalDir });
        expect(await fs.pathExists(path.join(globalDir, 'dest'))).toBe(true);
        expect(await fs.pathExists(path.join(globalDir, 'src'))).toBe(false);
    });

    it('covers prepareCommand empty args', async () => {
        await expect(scaffold([], { cwd: localDir })).rejects.toThrow('No command path provided');
    });

    it('covers list with existing local group shadowing global group', async () => {
        const localGroup = path.join(localDir, '.agentctl', 'group');
        const globalGroup = path.join(globalDir, 'group');
        await fs.ensureDir(localGroup);
        await fs.ensureDir(globalGroup);

        // This will hit the branch where it already has the path and scope is local
        const cmds = await list({ cwd: localDir, globalDir });
        expect(cmds.find(c => c.path === 'group')?.scope).toBe('local');
    });

    it('covers non-win32 scaffold', async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'linux' });
        await scaffold(['linuxcmd'], { cwd: localDir });
        const scriptPath = path.join(localDir, '.agentctl', 'linuxcmd', 'command.sh');
        expect(await fs.pathExists(scriptPath)).toBe(true);
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('covers installSkill unimplemented agent logic', async () => {
        // We modify the array to trick the check for coverage of the "else" branch
        SUPPORTED_AGENTS.push('test-agent');
        try {
            await expect(installSkill('test-agent', { cwd: localDir })).rejects.toThrow("Agent logic for 'test-agent' not implemented");
        } finally {
            SUPPORTED_AGENTS.pop();
        }
    });

    it('covers copySkill skill file not found paths', async () => {
        const originalExists = fs.existsSync;
        let callCount = 0;
        const spy = vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
            const pStr = p.toString();
            // Count calls for SKILL.md checks
            if (pStr.includes('SKILL.md')) {
                callCount++;
            }
            return originalExists(p);
        });

        const targetDir = path.join(localDir, 'skills');

        vi.spyOn(fs, 'copy').mockResolvedValue(undefined);

        // Case 0: Succeed on 1st attempt (immediate)
        callCount = 0;
        spy.mockImplementation((p: fs.PathLike) => {
            const pStr = p.toString();
            if (pStr.endsWith('SKILL.md')) {
                return true;
            }
            return originalExists(p);
        });
        await copySkill(targetDir, 'antigravity');

        // Case 1: Succeed on 2nd attempt
        callCount = 0;
        spy.mockImplementation((p: fs.PathLike) => {
            const pStr = p.toString();
            if (pStr.endsWith('SKILL.md')) {
                callCount++;
                if (callCount < 2) return false;
                return true;
            }
            return originalExists(p);
        });
        await copySkill(targetDir, 'antigravity');

        // Case 2: Succeed on 3rd attempt
        callCount = 0;
        spy.mockImplementation((p: fs.PathLike) => {
            const pStr = p.toString();
            if (pStr.endsWith('SKILL.md')) {
                callCount++;
                if (callCount < 3) return false;
                return true;
            }
            return originalExists(p);
        });

        await copySkill(targetDir, 'antigravity');

        // Case 3: Fail all attempts
        callCount = 0;
        spy.mockImplementation((p: fs.PathLike) => {
            const pStr = p.toString();
            if (pStr.endsWith('SKILL.md')) {
                return false;
            }
            return originalExists(p);
        });

        await expect(copySkill(targetDir, 'antigravity')).rejects.toThrow('Could not locate source SKILL.md');

        spy.mockRestore();
        vi.restoreAllMocks();
    });

    it('covers resolveCommand global check and file-as-directory cases', async () => {
        // Test global: true in resolveCommand
        const res = await resolveCommand(['nothing'], { global: true, globalDir });
        expect(res).toBeNull();

        // Test file at path preventing implicit group (local)
        const localFile = path.join(localDir, '.agentctl', 'file');
        await fs.ensureDir(path.dirname(localFile));
        await fs.writeFile(localFile, 'content');

        const resLocalFile = await resolveCommand(['file'], { cwd: localDir, globalDir });
        expect(resLocalFile).toBeNull(); // Should not treat as group

        // Test file at path preventing implicit group (global)
        const globalFile = path.join(globalDir, 'file');
        await fs.writeFile(globalFile, 'content');

        const resGlobalFile = await resolveCommand(['file'], { cwd: localDir, globalDir });
        expect(resGlobalFile).toBeNull();
    });

    it('covers list with file in directory (not directory)', async () => {
        // Create a file inside .agentctl that list() iterates over but ignores because it's not a dir
        const localCtl = path.join(localDir, '.agentctl');
        await fs.ensureDir(localCtl);
        const localFile = path.join(localCtl, 'notadir');
        await fs.writeFile(localFile, 'content');

        const cmds = await list({ cwd: localDir, globalDir });
        expect(cmds.find(c => c.path === 'notadir')).toBeUndefined();
    });

    it('covers isCapped exception', async () => {
        const cappedDir = path.join(localDir, '.agentctl', 'badjson');
        await fs.ensureDir(cappedDir);
        await fs.writeFile(path.join(cappedDir, 'manifest.json'), '{ bad }');

        // We try to scaffold inside it.
        // The parent check for isCapped should fail to parse JSON and return false (safe).
        await scaffold(['badjson', 'sub'], { cwd: localDir });
        expect(await fs.pathExists(path.join(cappedDir, 'sub'))).toBe(true);
    });

    it('covers list shadowing branches', async () => {
        // Case: Global (Group) checked when local doesn't exist? (Implicit logic) -> Covered by standard flows.
        // We want to verify `existing.scope === 'local'` check (line 289 ctl.ts)
        // If we have a Global command, then Local command that is NOT group? (conflict?)
        // Or Global command, then finding another Global command with same name (impossible in fs unless case sensitivity issues, but iteration logic handles files once).

        // Let's cover explicit code path where we find a Global item and it shadows nothing (normal).
        // Let's Try: Local Group exists. Global Scan finds same name.
        // Walk Global:
        // finds 'common'. Adds to map? No, map has 'common' from local scan (scope='local').
        // entering else block (line 288).
        // `existing.scope === 'local'` is true.
        // `existing.type === 'group'` is true.
        // `type` (of global item) is 'group'.
        // -> recursively walk global.

        // We need:
        // 1. Local Group 'common'
        // 2. Global Group 'common'
        // This should trigger the merge walk.

        const localCommon = path.join(localDir, '.agentctl', 'common');
        await fs.ensureDir(localCommon);

        const globalCommon = path.join(globalDir, 'common');
        await fs.ensureDir(globalCommon);
        await fs.ensureDir(path.join(globalCommon, 'sub')); // Subcommand in global common

        const cmds = await list({ cwd: localDir, globalDir });
        expect(cmds.find(c => c.path === 'common sub')).toBeDefined();

        // Local Group shadows Global Capped
        const localGroup = path.join(localDir, '.agentctl', 'shadow1');
        await fs.ensureDir(localGroup);

        const globalCapped = path.join(globalDir, 'shadow1');
        await fs.ensureDir(globalCapped);
        await fs.writeJson(path.join(globalCapped, 'manifest.json'), { name: 'shadow1', run: 'echo' });

        const cmds2 = await list({ cwd: localDir, globalDir });
        const shadow1 = cmds2.find(c => c.path === 'shadow1');
        expect(shadow1?.scope).toBe('local');
        expect(shadow1?.type).toBe('group');

        // Local Capped shadows Global Group
        const localCapped = path.join(localDir, '.agentctl', 'shadow2');
        await fs.ensureDir(localCapped);
        await fs.writeJson(path.join(localCapped, 'manifest.json'), { name: 'shadow2', run: 'echo' });

        const globalGroup2 = path.join(globalDir, 'shadow2');
        await fs.ensureDir(globalGroup2);

        const cmds3 = await list({ cwd: localDir, globalDir });
        const shadow2 = cmds3.find(c => c.path === 'shadow2');
        expect(shadow2?.scope).toBe('local');
        expect(shadow2?.type).not.toBe('group'); // capped/scaffold
    });

    it('covers mv implicit group (no manifest)', async () => {
        // Create implicit group
        const groupDir = path.join(localDir, '.agentctl', 'implicit');
        await fs.ensureDir(groupDir);

        // Move it
        await mv(['implicit'], ['moved_implicit'], { cwd: localDir, globalDir });

        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'moved_implicit'))).toBe(true);
        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'implicit'))).toBe(false);
        // And manifest check should simply pass (if exists logic)
    });

    it('covers list outside local context', async () => {
        const nonProjectDir = path.join(tmpDir, 'nonproject');
        await fs.ensureDir(nonProjectDir);

        const cmds = await list({ cwd: nonProjectDir, globalDir });
        // Should only return global commands
        // Ensure there is at least one global command for verification or empty is fine
        // verification:
        expect(Array.isArray(cmds)).toBe(true);
    });

    it('covers deep nesting (isCapped checks)', async () => {
        // Create a group
        await group(['L1'], { cwd: localDir });
        // Create L2
        await group(['L1', 'L2'], { cwd: localDir });
        // Create L3
        await scaffold(['L1', 'L2', 'L3'], { cwd: localDir });

        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'L1', 'L2', 'L3'))).toBe(true);
    });

    it('covers capped manifest without type (defaults to scaffold)', async () => {
        const cappedDir = path.join(localDir, '.agentctl', 'notype');
        await fs.ensureDir(cappedDir);
        // Explicitly undefined type but has run
        await fs.writeJson(path.join(cappedDir, 'manifest.json'), { name: 'notype', run: 'echo' });

        const cmds = await list({ cwd: localDir, globalDir });
        const cmd = cmds.find(c => c.path === 'notype');
        expect(cmd?.type).toBe('scaffold');
    });

    it('covers mv rootDir failure logic', async () => {
        // We mock findLocalRoot to succeed for resolveCommand (first call)
        // and return null for mv (second call).

        // This requires 'resolveCommand' to find something local.
        // We can create a local command.
        const cmdDir = path.join(localDir, '.agentctl', 'failmv');
        await fs.ensureDir(cmdDir);
        await fs.writeJson(path.join(cmdDir, 'manifest.json'), { name: 'failmv', type: 'scaffold' });

        // Use spyOn with the wildcard import
        const spy = vi.spyOn(fsUtils, 'findLocalRoot');
        let calls = 0;
        spy.mockImplementation(() => {
            calls++;
            if (calls === 1) return localDir; // For resolveCommand
            return null; // For mv
        });

        await expect(mv(['failmv'], ['dest'], { cwd: localDir })).rejects.toThrow('Cannot determine root for move');

        spy.mockRestore();
    });

    it('covers rm global failure message', async () => {
        // Ensure it doesn't exist
        await expect(rm(['failrm'], { global: true, globalDir })).rejects.toThrow('in global scope');
    });

    it('covers group manifest without type (implicit default)', async () => {
        const groupDir = path.join(localDir, '.agentctl', 'implicittype');
        await fs.ensureDir(groupDir);
        await fs.writeJson(path.join(groupDir, 'manifest.json'), { name: 'implicittype', description: 'desc' });

        const cmds = await list({ cwd: localDir, globalDir });
        const cmd = cmds.find(c => c.path === 'implicittype');
        expect(cmd?.type).toBe('group');
    });

    it('covers installSkill gemini default path', async () => {
        const origHome = process.env.HOME;
        const origUserProfile = process.env.USERPROFILE;
        const mockHome = path.join(tmpDir, 'mock_home');

        process.env.HOME = mockHome;
        process.env.USERPROFILE = mockHome;

        try {
            await installSkill('gemini', { global: true });

            const skillPath = path.join(mockHome, '.gemini', 'skills', 'agentctl', 'SKILL.md');
            expect(await fs.pathExists(skillPath)).toBe(true);
        } finally {
            process.env.HOME = origHome;
            process.env.USERPROFILE = origUserProfile;
        }
    });

    it('covers list/prepareCommand without cwd option', async () => {
        const origCwd = process.cwd();
        try {
            process.chdir(localDir);

            const cmds = await list();
            expect(Array.isArray(cmds)).toBe(true);

            await scaffold(['newcmd']);
            expect(await fs.pathExists(path.join(localDir, '.agentctl', 'newcmd'))).toBe(true);

            // Also test mv without cwd
            await mv(['newcmd'], ['newcmd_moved']);
            expect(await fs.pathExists(path.join(localDir, '.agentctl', 'newcmd_moved'))).toBe(true);

        } finally {
            process.chdir(origCwd);
        }
    });

    it('covers pushGlobal/pullLocal outside local context', async () => {
        const outsideDir = path.join(tmpDir, 'outside');
        await fs.ensureDir(outsideDir);

        await expect(pushGlobal(['any'], { cwd: outsideDir, globalDir })).rejects.toThrow('Not in a local context');
        await expect(pullLocal(['any'], { cwd: outsideDir, globalDir })).rejects.toThrow('Not in a local context');
    });

    it('covers mv global default root (no globalDir)', async () => {
        const mockHome = path.join(tmpDir, 'mock_home_mv');
        const origHome = process.env.HOME;
        const origAppData = process.env.APPDATA;

        process.env.HOME = mockHome;
        process.env.APPDATA = mockHome;

        try {
            let globalRoot;
            if (process.platform === 'win32') {
                globalRoot = path.join(mockHome, 'agentctl');
            } else {
                globalRoot = path.join(mockHome, '.config', 'agentctl');
            }

            await fs.ensureDir(globalRoot);
            const cmdDir = path.join(globalRoot, 'mv_def');
            await fs.ensureDir(cmdDir);
            await fs.writeJson(path.join(cmdDir, 'manifest.json'), { name: 'mv_def', type: 'scaffold' });

            await mv(['mv_def'], ['mv_def_moved'], { cwd: localDir });
            expect(await fs.pathExists(path.join(globalRoot, 'mv_def_moved'))).toBe(true);
        } finally {
            process.env.HOME = origHome;
            process.env.APPDATA = origAppData;
        }
    });

    it('covers installSkill antigravity default path', async () => {
        const mockHome = path.join(tmpDir, 'mock_home_ag');
        await fs.ensureDir(mockHome);
        const origAppData = process.env.APPDATA;
        const origHome = process.env.HOME;
        const origUserProfile = process.env.USERPROFILE;

        process.env.APPDATA = mockHome;
        process.env.HOME = mockHome;
        process.env.USERPROFILE = mockHome;

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        try {
            await installSkill('antigravity', { global: true });

            // Check logs to see where it installed
            const calls = logSpy.mock.calls.map(c => c[0]);
            const installMsg = calls.find(msg => msg.includes('Installed skill for antigravity'));
            if (!installMsg) {
                throw new Error('Install message not found');
            }

            // Expected path should be in mockHome
            // On Windows: mockHome/.gemini/antigravity or mockHome/antigravity...
            // getAntigravityGlobalRoot uses os.homedir(). we mocked USERPROFILE/HOME, so it should be mockHome.
            // .gemini/antigravity is the standard path in fs-utils.

            expect(installMsg).toContain(mockHome);
            expect(installMsg).toContain('antigravity');
            expect(installMsg).toContain('skills');

            // Also check file existence based on path extracted?
            // "Installed skill for antigravity at <path>"
            const installedPath = installMsg.split(' at ')[1].trim();
            expect(await fs.pathExists(installedPath)).toBe(true);

        } finally {
            logSpy.mockRestore();
            process.env.APPDATA = origAppData;
            process.env.HOME = origHome;
            process.env.USERPROFILE = origUserProfile;
        }
    });

    it('covers installSkill gemini global options and env vars', async () => {
        const mockHome = path.join(tmpDir, 'mock_gemini');
        await fs.ensureDir(mockHome);

        const origHome = process.env.HOME;
        const origUserProfile = process.env.USERPROFILE;

        process.env.HOME = '';
        process.env.USERPROFILE = '';

        try {
            // Case 1: explicit globalDir
            const explicitDir = path.join(tmpDir, 'explicit_gemini');
            await installSkill('gemini', { global: true, geminiGlobalDir: explicitDir });
            expect(await fs.pathExists(path.join(explicitDir, 'skills', 'agentctl', 'SKILL.md'))).toBe(true);

            // Case 2: default via HOME
            process.env.HOME = mockHome;
            await installSkill('gemini', { global: true });
            expect(await fs.pathExists(path.join(mockHome, '.gemini', 'skills', 'agentctl', 'SKILL.md'))).toBe(true);

            // Case 3: default via USERPROFILE (HOME empty)
            process.env.HOME = '';
            process.env.USERPROFILE = mockHome;
            // Clean up previous run
            await fs.remove(path.join(mockHome, '.gemini'));
            await installSkill('gemini', { global: true });
            expect(await fs.pathExists(path.join(mockHome, '.gemini', 'skills', 'agentctl', 'SKILL.md'))).toBe(true);

        } finally {
            process.env.HOME = origHome;
            process.env.USERPROFILE = origUserProfile;
        }
    });

    it('covers mv with explicit options (cwd/globalDir)', async () => {
        // Local: explicit cwd
        const subDir = path.join(localDir, 'subdir');
        await fs.ensureDir(subDir);
        // We need .agentctl relative to that cwd? No, findLocalRoot walks up.
        // If we pass cwd=subDir, findLocalRoot finds localDir. Correct.

        // Create source command 
        const srcCmd = path.join(localDir, '.agentctl', 'mv_src');
        await fs.ensureDir(srcCmd);
        await fs.writeJson(path.join(srcCmd, 'manifest.json'), { name: 'mv_src', type: 'scaffold' });

        await mv(['mv_src'], ['mv_dest_cwd'], { cwd: subDir });
        expect(await fs.pathExists(path.join(localDir, '.agentctl', 'mv_dest_cwd'))).toBe(true);

        // Global: explicit globalDir
        const customGlobal = path.join(tmpDir, 'custom_global');
        await fs.ensureDir(customGlobal);
        const globalSrc = path.join(customGlobal, 'g_src');
        await fs.ensureDir(globalSrc);
        await fs.writeJson(path.join(globalSrc, 'manifest.json'), { name: 'g_src', type: 'scaffold' });

        await mv(['g_src'], ['g_dest'], { global: true, globalDir: customGlobal });
        expect(await fs.pathExists(path.join(customGlobal, 'g_dest'))).toBe(true);
    });

    it('covers list with non-existent global dir', async () => {
        const missingGlobal = path.join(tmpDir, 'missing_global');
        // Ensure it doesn't exist
        await fs.remove(missingGlobal);

        const cmds = await list({ cwd: localDir, globalDir: missingGlobal });
        // Should rely on walking local only.
        // We verify no error thrown and correct behavior.
        expect(Array.isArray(cmds)).toBe(true);
    });

    it('covers list collision (Global vs Global)', async () => {
        // Setup: global/a (dir) -> global/a/b (subcommand) => logical path "a b"
        // Setup: global/a b (dir) => logical path "a b"

        const gRoot = path.join(tmpDir, 'g_collision');
        await fs.ensureDir(gRoot);

        const dirA = path.join(gRoot, 'a');
        await fs.ensureDir(dirA);
        const dirAB = path.join(dirA, 'b'); // "a b"
        await fs.ensureDir(dirAB);
        await fs.writeJson(path.join(dirAB, 'manifest.json'), { name: 'b', description: 'nested' });

        const dirSpace = path.join(gRoot, 'a b'); // "a b"
        await fs.ensureDir(dirSpace);
        await fs.writeJson(path.join(dirSpace, 'manifest.json'), { name: 'a b', description: 'top' });

        // Depending on iteration order, one will register first.
        // The second one will hit `commands.has() -> true`.
        // Inspecting `ctl.ts`: `commands.set` only happens if `!commands.has`.
        // So the first one wins.
        // We just need to ensure `scope !== 'local'` branch is hit.
        // Since both are global, existing.scope is 'global'.

        const cmds = await list({ cwd: localDir, globalDir: gRoot });
        const collision = cmds.filter(c => c.path === 'a b');
        expect(collision.length).toBe(1); // Should only have one entry
        // And we verified logic didn't crash
    });
});
