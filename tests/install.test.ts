import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { planInstallClone, planInstallCopy, InstallContext } from '../src/logic/install';
import { install } from '../src/ctl';
import path from 'path';
import fs from 'fs-extra';
import * as effects from '../src/effects';
import * as fsUtils from '../src/fs-utils';

describe('Logic: install', () => {
    const baseCtx: InstallContext = {
        repoUrl: 'https://github.com/org/repo',
        pathParts: [],
        global: false,
        allowCollisions: false,
        localRoot: '/project',
        globalRoot: '/global',
        osTmpdir: '/tmp'
    };

    describe('planInstallClone', () => {
        it('plans a git clone to a temp directory', () => {
            const { effects, tempDir } = planInstallClone(baseCtx, { tempFolderName: 'test-folder' });

            expect(tempDir).toBe(path.join('/tmp', 'test-folder'));
            expect(effects).toHaveLength(2);
            expect(effects[0].type).toBe('log');
            expect(effects[1]).toEqual({
                type: 'gitClone',
                url: 'https://github.com/org/repo',
                dest: path.join('/tmp', 'test-folder')
            });
        });

        it('throws if trying to install locally outside a project', () => {
            expect(() => {
                planInstallClone({ ...baseCtx, localRoot: null }, { tempFolderName: 'test' });
            }).toThrow('Not in a local context');
        });
    });

    describe('planInstallCopy', () => {
        it('plans an install without collisions', () => {
            const { effects } = planInstallCopy(
                { ...baseCtx, pathParts: ['mygroup'] },
                {
                    tempAgentctlDir: '/tmp/test/.agentctl',
                    existingItems: ['other_cmd'],
                    downloadedItems: ['new_cmd1', 'new_cmd2']
                }
            );

            expect(effects).toHaveLength(4);
            expect(effects[0].type).toBe('mkdir');
            expect(effects[0]).toMatchObject({ path: path.join('/project/.agentctl', 'mygroup') });

            expect(effects[1].type).toBe('copy');
            expect(effects[1]).toMatchObject({
                src: '/tmp/test/.agentctl',
                dest: path.join('/project/.agentctl', 'mygroup'),
                options: { overwrite: false }
            });

            expect(effects[2].type).toBe('remove'); // temp dir cleanup
            expect(effects[3].type).toBe('log'); // success message
        });

        it('aborts on collision when --allow-collisions is not provided', () => {
            expect(() => {
                planInstallCopy(
                    baseCtx,
                    {
                        tempAgentctlDir: '/tmp/test/.agentctl',
                        existingItems: ['existing_cmd', 'other_cmd'],
                        downloadedItems: ['new_cmd', 'existing_cmd']
                    }
                );
            }).toThrow('Installation aborted due to collisions');
        });

        it('proceeds on collision when --allow-collisions is provided', () => {
            const { effects } = planInstallCopy(
                { ...baseCtx, allowCollisions: true },
                {
                    tempAgentctlDir: '/tmp/test/.agentctl',
                    existingItems: ['existing_cmd', 'other_cmd'],
                    downloadedItems: ['new_cmd', 'existing_cmd']
                }
            );

            const copyEffect = effects.find(e => e.type === 'copy') as any;
            expect(copyEffect.options).toMatchObject({ overwrite: true });
        });

        it('installs globally if flag is true', () => {
            const { effects } = planInstallCopy(
                { ...baseCtx, global: true },
                {
                    tempAgentctlDir: '/tmp/test/.agentctl',
                    existingItems: [],
                    downloadedItems: ['cmd']
                }
            );

            expect(effects[0].type).toBe('mkdir');
            // path.join('/global') results in '\global' on Windows, so we use path.join
            expect((effects[0] as any).path).toBe(path.join('/global'));
        });

        it('throws if trying to install locally outside a project', () => {
            expect(() => {
                planInstallCopy({ ...baseCtx, localRoot: null }, {
                    tempAgentctlDir: 'a', existingItems: [], downloadedItems: []
                });
            }).toThrow('Not in a local context');
        });
    });

    describe('Integration: install', () => {
        beforeEach(() => {
            vi.spyOn(fs, 'pathExists').mockImplementation(async () => true);
            vi.spyOn(fs, 'readdir').mockImplementation(async () => []);
            vi.spyOn(fs, 'remove').mockImplementation(async () => { });
            vi.spyOn(fs, 'ensureDir').mockImplementation(async () => { });
            vi.spyOn(fs, 'copy').mockImplementation(async () => { });

            vi.spyOn(effects, 'execute').mockImplementation(async () => { });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('orchestrates clone and copy', async () => {
            (fs.pathExists as any).mockResolvedValue(true);
            (fs.readdir as any).mockResolvedValue(['test-cmd']);

            await install('https://github.com/foo/bar', ['mygroup'], { global: true, allowCollisions: true });
            expect(effects.execute).toHaveBeenCalledTimes(2);
        });

        it('orchestrates clone and copy locally', async () => {
            (fs.pathExists as any).mockResolvedValue(true);
            (fs.readdir as any).mockResolvedValue(['test-cmd']);
            vi.spyOn(fsUtils, 'findLocalRoot').mockReturnValue('/project');

            await install('https://github.com/foo/bar', ['mygroup'], { allowCollisions: true });
            expect(effects.execute).toHaveBeenCalledTimes(2);
        });

        it('orchestrates clone and copy when target does not exist', async () => {
            (fs.pathExists as any).mockImplementation(async (p: string) => {
                // Must return true for tempAgentctlDir
                return p.includes('agentctl-install-');
            });
            (fs.readdir as any).mockResolvedValue(['test-cmd']);
            vi.spyOn(fsUtils, 'findLocalRoot').mockReturnValue('/project');

            await install('https://github.com/foo/bar', ['mygroup']);
            expect(effects.execute).toHaveBeenCalledTimes(2);
        });

        it('throws if repository has no .agentctl directory', async () => {
            (fs.pathExists as any).mockImplementation(async (p: any) => {
                if (typeof p === 'string' && p.endsWith('.agentctl')) return false;
                if (typeof p === 'string' && p.includes('.agentctl')) return true;
                return true;
            });
            await expect(install('https://github.com/foo/bar', [], { global: true })).rejects.toThrow('Repository does not contain an .agentctl directory');
        });
    });
});
