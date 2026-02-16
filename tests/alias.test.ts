import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { alias } from '../src/ctl';

describe('ctl alias', () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = await createTestDir();
    });

    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('creates an alias manifest without script', async () => {
        await alias(['tools', 'gh'], 'gh', { cwd });

        const cmdDir = path.join(cwd, '.agentctl', 'tools', 'gh');
        expect(await fs.pathExists(cmdDir)).toBe(true);

        const manifestPath = path.join(cmdDir, 'manifest.json');
        expect(await fs.pathExists(manifestPath)).toBe(true);
        const manifest = await fs.readJson(manifestPath);

        expect(manifest).toEqual(expect.objectContaining({
            name: 'gh',
            type: 'alias',
            run: 'gh',
            description: '',
        }));

        const scriptPath = path.join(cmdDir, 'command.sh');
        const cmdPath = path.join(cmdDir, 'command.cmd');
        expect(await fs.pathExists(scriptPath)).toBe(false);
        expect(await fs.pathExists(cmdPath)).toBe(false);
    });

    it('fails if command already exists', async () => {
        const cmdDir = path.join(cwd, '.agentctl', 'tools', 'gh');
        await fs.ensureDir(cmdDir);

        await expect(alias(['tools', 'gh'], 'gh', { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
