import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTestDir, cleanupTestDir } from './helpers';
import { mv, scaffold } from '../src/ctl';

describe('lifecycle nesting guards', () => {
    let testDir: string;
    let agentctlDir: string;

    beforeEach(async () => {
        testDir = await createTestDir();
        agentctlDir = path.join(testDir, '.agentctl');
        await fs.ensureDir(agentctlDir);
    });

    afterEach(async () => {
        await cleanupTestDir(testDir);
    });

    it('mv throws when trying to nest under a capped command', async () => {
        // Create a capped command 'calc'
        await scaffold(['calc'], { cwd: testDir });

        // Create another command 'git'
        await scaffold(['git'], { cwd: testDir });

        // Try to move 'git' to 'calc sub'
        // This should fail because 'calc' is capped (has run script)
        await expect(
            mv(['git'], ['calc', 'sub'], { cwd: testDir })
        ).rejects.toThrow('Cannot nest command under capped command');
    });

    it('scaffold throws when trying to nest under a capped command', async () => {
        // Create a capped command 'calc'
        await scaffold(['calc'], { cwd: testDir });

        // Try to scaffold 'calc sub'
        await expect(
            scaffold(['calc', 'sub'], { cwd: testDir })
        ).rejects.toThrow('Cannot nest command under capped command');
    });
});
