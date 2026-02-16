import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { rm, mv, scaffold } from '../src/ctl';

describe('ctl lifecycle (rm, mv)', () => {
    let cwd: string;
    beforeEach(async () => {
        cwd = await createTestDir();
    });
    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('rm: removes command logic', async () => {
        await scaffold(['deploy'], { cwd });
        const cmdDir = path.join(cwd, '.agentctl', 'deploy');
        expect(await fs.pathExists(cmdDir)).toBe(true);

        await rm(['deploy'], { cwd });
        expect(await fs.pathExists(cmdDir)).toBe(false);
    });

    it('rm: removes group', async () => {
        await scaffold(['dev', 'start'], { cwd });
        const devDir = path.join(cwd, '.agentctl', 'dev');
        expect(await fs.pathExists(devDir)).toBe(true);
        expect(await fs.pathExists(path.join(devDir, 'start'))).toBe(true);

        await rm(['dev'], { cwd });
        expect(await fs.pathExists(devDir)).toBe(false);
    });

    it('mv: moves command and updates name', async () => {
        await scaffold(['deploy'], { cwd });
        const oldDir = path.join(cwd, '.agentctl', 'deploy');
        const manifestPath = path.join(oldDir, 'manifest.json');
        expect((await fs.readJson(manifestPath)).name).toBe('deploy');

        // Move deploy -> release
        await mv(['deploy'], ['release'], { cwd });

        const newDir = path.join(cwd, '.agentctl', 'release');
        expect(await fs.pathExists(oldDir)).toBe(false);
        expect(await fs.pathExists(newDir)).toBe(true);

        const newManifest = await fs.readJson(path.join(newDir, 'manifest.json'));
        expect(newManifest.name).toBe('release');
    });

    it('mv: fails if destination exists', async () => {
        await scaffold(['deploy'], { cwd });
        await scaffold(['release'], { cwd });

        await expect(mv(['deploy'], ['release'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
