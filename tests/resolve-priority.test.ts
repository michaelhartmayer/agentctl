import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTestDir, cleanupTestDir } from './helpers';
import { resolveCommand } from '../src/resolve';

describe('resolve scope priority', () => {
    let testDir: string;
    let globalDir: string;

    beforeEach(async () => {
        testDir = await createTestDir();
        globalDir = await createTestDir();
        await fs.ensureDir(path.join(testDir, '.agentctl'));
    });

    afterEach(async () => {
        await cleanupTestDir(testDir);
        await cleanupTestDir(globalDir);
    });

    it('local group shadows global group at the same path', async () => {
        // Create a group in both local and global with the same name
        const localCmd = path.join(testDir, '.agentctl', 'tools');
        await fs.ensureDir(localCmd);
        await fs.writeJson(path.join(localCmd, 'manifest.json'), {
            name: 'tools', type: 'group', description: 'local tools'
        });

        const globalCmd = path.join(globalDir, 'tools');
        await fs.ensureDir(globalCmd);
        await fs.writeJson(path.join(globalCmd, 'manifest.json'), {
            name: 'tools', type: 'group', description: 'global tools'
        });

        const result = await resolveCommand(['tools'], { cwd: testDir, globalDir });
        expect(result).not.toBeNull();
        expect(result!.scope).toBe('local');
        expect(result!.manifest.description).toBe('local tools');
    });

    it('local capped command shadows global capped command', async () => {
        const localCmd = path.join(testDir, '.agentctl', 'deploy');
        await fs.ensureDir(localCmd);
        await fs.writeJson(path.join(localCmd, 'manifest.json'), {
            name: 'deploy', type: 'scaffold', run: './local-deploy.sh'
        });

        const globalCmd = path.join(globalDir, 'deploy');
        await fs.ensureDir(globalCmd);
        await fs.writeJson(path.join(globalCmd, 'manifest.json'), {
            name: 'deploy', type: 'scaffold', run: './global-deploy.sh'
        });

        const result = await resolveCommand(['deploy'], { cwd: testDir, globalDir });
        expect(result).not.toBeNull();
        expect(result!.scope).toBe('local');
        expect(result!.manifest.run).toBe('./local-deploy.sh');
    });

    it('global command resolves when no local exists', async () => {
        const globalCmd = path.join(globalDir, 'deploy');
        await fs.ensureDir(globalCmd);
        await fs.writeJson(path.join(globalCmd, 'manifest.json'), {
            name: 'deploy', type: 'scaffold', run: './deploy.sh'
        });

        const result = await resolveCommand(['deploy'], { cwd: testDir, globalDir });
        expect(result).not.toBeNull();
        expect(result!.scope).toBe('global');
    });
});
