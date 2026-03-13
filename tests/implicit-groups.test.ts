import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { inspect, scaffold } from '../src/ctl';

describe('implicit group manifests', () => {
    let cwd: string;

    beforeEach(async () => {
        cwd = await createTestDir();
    });

    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('materializes parent group manifest for nested scaffolds', async () => {
        await scaffold(['foo', 'bar'], { cwd });

        const parentManifestPath = path.join(cwd, '.agentctl', 'foo', 'manifest.json');
        expect(await fs.pathExists(parentManifestPath)).toBe(true);
        const parentManifest = await fs.readJson(parentManifestPath);
        expect(parentManifest).toEqual(expect.objectContaining({
            name: 'foo',
            type: 'group',
        }));

        const details = await inspect(['foo'], { cwd });
        expect(details?.resolvedPath).toBe(parentManifestPath);
        expect(await fs.pathExists(details!.resolvedPath)).toBe(true);
    });
});
