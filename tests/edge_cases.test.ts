import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { rm, mv, inspect, pullLocal, list, pushGlobal, installSkill, scaffold } from '../src/ctl';
import { resolveCommand } from '../src/resolve';
import { readManifest } from '../src/manifest';
import { getGlobalRoot, getAntigravityGlobalRoot } from '../src/fs-utils';

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
        const spy = vi.spyOn(fs, 'stat').mockImplementation(async (p: any) => {
            if (p.toString().includes('failme')) {
                throw new Error('stat error');
            }
            return (originalStat as any)(p);
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
});
