import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { resolveCommand } from '../src/resolve';
import { scaffold } from '../src/ctl';

describe('resolveCommand', () => {
    let localRoot: string;
    let globalRoot: string;
    let baseDir: string;

    beforeEach(async () => {
        baseDir = await createTestDir();
        localRoot = path.join(baseDir, 'local');
        globalRoot = path.join(baseDir, 'global');
        await fs.ensureDir(localRoot);
        await fs.ensureDir(globalRoot);
    });

    afterEach(async () => {
        await cleanupTestDir(baseDir);
    });

    it('resolves local command', async () => {
        // Create local command 'deploy' in localRoot/.agentctl/deploy
        await scaffold(['deploy'], { cwd: localRoot });

        const result = await resolveCommand(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        expect(result).not.toBeNull();
        expect(result!.manifest.name).toBe('deploy');
        expect(result!.scope).toBe('local');
        expect(result!.args).toEqual([]);
    });

    it('resolves global command', async () => {
        // Create global alias 'gh' in globalRoot/gh
        const cmdDir = path.join(globalRoot, 'gh');
        await fs.ensureDir(cmdDir);
        await fs.writeJson(path.join(cmdDir, 'manifest.json'), { name: 'gh', type: 'alias', run: 'gh' });

        const result = await resolveCommand(['gh'], { cwd: localRoot, globalDir: globalRoot });
        expect(result).not.toBeNull();
        expect(result!.manifest.name).toBe('gh');
        expect(result!.scope).toBe('global');
    });

    it('prioritizes local over global', async () => {
        // Local 'deploy' (manifest type scaffold)
        await scaffold(['deploy'], { cwd: localRoot });

        // Global 'deploy' (manifest type alias)
        const cmdDir = path.join(globalRoot, 'deploy');
        await fs.ensureDir(cmdDir);
        await fs.writeJson(path.join(cmdDir, 'manifest.json'), { name: 'deploy', type: 'alias', run: 'echo global' });

        const result = await resolveCommand(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        expect(result).not.toBeNull();
        expect(result!.scope).toBe('local');
        // Ensure we got the scaffold manifest (which has type 'scaffold')
        expect(result!.manifest.type).toBe('scaffold');
    });

    it('returns null if not found', async () => {
        const result = await resolveCommand(['missing'], { cwd: localRoot, globalDir: globalRoot });
        expect(result).toBeNull();
    });

    it('handles nested properties', async () => {
        // Local group 'dev', command 'start'
        await scaffold(['dev', 'start'], { cwd: localRoot });

        const result = await resolveCommand(['dev', 'start'], { cwd: localRoot, globalDir: globalRoot });
        expect(result).not.toBeNull();
        expect(result!.manifest.name).toBe('start');
        expect(result!.cmdPath).toBe('dev start'); // Should construct cmdPath?
    });
});
