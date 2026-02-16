import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { scaffold } from '../src/ctl';

describe('ctl scaffold', () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = await createTestDir();
    });

    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('creates a capped command with manifest and script', async () => {
        await scaffold(['deploy'], { cwd });

        const cmdDir = path.join(cwd, '.agentctl', 'deploy');
        expect(await fs.pathExists(cmdDir)).toBe(true);

        const manifestPath = path.join(cmdDir, 'manifest.json');
        expect(await fs.pathExists(manifestPath)).toBe(true);
        const manifest = await fs.readJson(manifestPath);

        expect(manifest).toEqual(expect.objectContaining({
            name: 'deploy',
            type: 'scaffold',
            description: '',
        }));

        const scriptPath = path.join(cmdDir, manifest.run);
        expect(await fs.pathExists(scriptPath)).toBe(true);

        const scriptContent = await fs.readFile(scriptPath, 'utf-8');
        if (process.platform === 'win32') {
            expect(scriptContent).toContain('@echo off');
        } else {
            expect(scriptContent).toContain('#!/usr/bin/env');
        }
    });

    it('creates nested commands implicitly creating groups', async () => {
        await scaffold(['dev', 'start'], { cwd });

        const groupDir = path.join(cwd, '.agentctl', 'dev');
        expect(await fs.pathExists(groupDir)).toBe(true);

        const cmdDir = path.join(groupDir, 'start');
        expect(await fs.pathExists(cmdDir)).toBe(true);
    });

    it('fails if command already exists', async () => {
        await scaffold(['deploy'], { cwd });

        await expect(scaffold(['deploy'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
