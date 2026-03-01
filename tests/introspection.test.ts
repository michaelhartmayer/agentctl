import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { list, inspect } from '../src/ctl';
import { scaffold } from '../src/ctl';

describe('ctl introspection', () => {
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

    it('list commands recursively from both scopes', async () => {
        // Local: dev start (scaffold), tools (group)
        await scaffold(['dev', 'start'], { cwd: localRoot });
        await fs.ensureDir(path.join(localRoot, '.agentctl', 'tools')); // implicit group

        // Global: gh (alias), tools lint (alias)
        const ghDir = path.join(globalRoot, 'gh');
        await fs.ensureDir(ghDir);
        await fs.writeJson(path.join(ghDir, 'manifest.json'), { name: 'gh', type: 'alias', run: 'gh' });

        const toolsLintDir = path.join(globalRoot, 'tools', 'lint');
        await fs.ensureDir(toolsLintDir);
        await fs.writeJson(path.join(toolsLintDir, 'manifest.json'), { name: 'lint', type: 'alias', run: 'lint' });

        const results = await list({ cwd: localRoot, globalDir: globalRoot });

        const paths = results.map(r => r.path).sort();
        expect(paths).not.toContain('dev');
        expect(paths).toContain('dev start');
        expect(paths).toContain('gh');
        expect(paths).not.toContain('tools');
        expect(paths).toContain('tools lint');

        const gh = results.find(r => r.path === 'gh');
        expect(gh.scope).toBe('global');
        expect(gh.type).toBe('alias');
    });

    it('inspect shows command details', async () => {
        await scaffold(['deploy'], { cwd: localRoot });

        const details = await inspect(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        expect(details).not.toBeNull();
        expect(details.manifest.name).toBe('deploy');
        expect(details.resolvedPath).toContain(path.join(localRoot, '.agentctl', 'deploy'));
    });
});
