import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTestDir, cleanupTestDir } from './helpers';
import { pushGlobal, pullLocal } from '../src/ctl';

describe('scoping error guards', () => {
    let testDir: string;
    let globalDir: string;

    beforeEach(async () => {
        testDir = await createTestDir();
        globalDir = await createTestDir();
        // Create .agentctl so findLocalRoot works
        await fs.ensureDir(path.join(testDir, '.agentctl'));
    });

    afterEach(async () => {
        await cleanupTestDir(testDir);
        await cleanupTestDir(globalDir);
    });

    it('pushGlobal throws if local command does not exist', async () => {
        await expect(
            pushGlobal(['nonexistent'], { cwd: testDir, globalDir })
        ).rejects.toThrow('not found');
    });

    it('pullLocal throws if global command does not exist', async () => {
        await expect(
            pullLocal(['nonexistent'], { cwd: testDir, globalDir })
        ).rejects.toThrow('not found');
    });

    it('pushGlobal throws if global command already exists', async () => {
        // Create local command
        const localCmd = path.join(testDir, '.agentctl', 'mycmd');
        await fs.ensureDir(localCmd);
        await fs.writeJson(path.join(localCmd, 'manifest.json'), {
            name: 'mycmd', type: 'scaffold', run: './script.sh'
        });

        // Create conflicting global command
        const globalCmd = path.join(globalDir, 'mycmd');
        await fs.ensureDir(globalCmd);
        await fs.writeJson(path.join(globalCmd, 'manifest.json'), {
            name: 'mycmd', type: 'scaffold', run: './script.sh'
        });

        await expect(
            pushGlobal(['mycmd'], { cwd: testDir, globalDir })
        ).rejects.toThrow('already exists');
    });

    it('pullLocal throws if local command already exists', async () => {
        // Create global command
        const globalCmd = path.join(globalDir, 'mycmd');
        await fs.ensureDir(globalCmd);
        await fs.writeJson(path.join(globalCmd, 'manifest.json'), {
            name: 'mycmd', type: 'scaffold', run: './script.sh'
        });

        // Create conflicting local command
        const localCmd = path.join(testDir, '.agentctl', 'mycmd');
        await fs.ensureDir(localCmd);
        await fs.writeJson(path.join(localCmd, 'manifest.json'), {
            name: 'mycmd', type: 'scaffold', run: './script.sh'
        });

        await expect(
            pullLocal(['mycmd'], { cwd: testDir, globalDir })
        ).rejects.toThrow('already exists');
    });
});
