import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { group, scaffold } from '../src/ctl';

describe('ctl group', () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = await createTestDir();
    });

    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('creates an uncapped command (group) with minimal manifest', async () => {
        await group(['dev'], { cwd });

        const groupDir = path.join(cwd, '.agentctl', 'dev');
        expect(await fs.pathExists(groupDir)).toBe(true);

        const manifestPath = path.join(groupDir, 'manifest.json');
        expect(await fs.pathExists(manifestPath)).toBe(true);
        const manifest = await fs.readJson(manifestPath);

        expect(manifest).toEqual(expect.objectContaining({
            name: 'dev',
            type: 'group',
        }));
        expect(manifest.run).toBeUndefined();
    });

    it('fails if path exists as capped command', async () => {
        // Create capped command 'dev'
        await scaffold(['dev'], { cwd });

        await expect(group(['dev'], { cwd }))
            .rejects.toThrow(/already exists/);
    });

    it('fails if path exists as directory (group)', async () => {
        await group(['dev'], { cwd });
        await expect(group(['dev'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
