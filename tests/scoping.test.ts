import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { pushGlobal, pullLocal, scaffold } from '../src/ctl';

describe('ctl scoping (global, local)', () => {
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

    it('pushGlobal: copies local to global with --copy', async () => {
        await scaffold(['deploy'], { cwd: localRoot });
        const localPath = path.join(localRoot, '.agentctl', 'deploy');
        const globalPath = path.join(globalRoot, 'deploy');

        expect(await fs.pathExists(localPath)).toBe(true);
        expect(await fs.pathExists(globalPath)).toBe(false);

        await pushGlobal(['deploy'], { cwd: localRoot, globalDir: globalRoot, copy: true });

        expect(await fs.pathExists(localPath)).toBe(true);
        expect(await fs.pathExists(globalPath)).toBe(true);
        const gManifest = await fs.readJson(path.join(globalPath, 'manifest.json'));
        expect(gManifest.name).toBe('deploy');
    });

    it('pushGlobal: moves local to global with --move', async () => {
        await scaffold(['deploy'], { cwd: localRoot });
        const localPath = path.join(localRoot, '.agentctl', 'deploy');
        const globalPath = path.join(globalRoot, 'deploy');

        await pushGlobal(['deploy'], { cwd: localRoot, globalDir: globalRoot, move: true });

        expect(await fs.pathExists(localPath)).toBe(false);
        expect(await fs.pathExists(globalPath)).toBe(true);
    });

    it('pullLocal: moves global to local', async () => {
        // Setup global manually
        const globalPath = path.join(globalRoot, 'deploy');
        await fs.ensureDir(globalPath);
        await fs.writeJson(path.join(globalPath, 'manifest.json'), { name: 'deploy', type: 'scaffold' });

        // Ensure local .agentctl exists
        await fs.ensureDir(path.join(localRoot, '.agentctl'));
        const localPath = path.join(localRoot, '.agentctl', 'deploy');

        await pullLocal(['deploy'], { cwd: localRoot, globalDir: globalRoot, move: true });

        expect(await fs.pathExists(globalPath)).toBe(false);
        expect(await fs.pathExists(localPath)).toBe(true);
    });
});
