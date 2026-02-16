import path from 'path';
import fs from 'fs-extra';
import { findLocalRoot, getGlobalRoot } from './fs-utils';
import { Manifest, readManifest, isCappedManifest } from './manifest';

export interface ResolvedCommand {
    manifestPath: string;
    manifest: Manifest;
    args: string[]; // remaining args
    scope: 'local' | 'global';
    cmdPath: string; // The command path e.g. "dev start"
}

export async function resolveCommand(args: string[], options: { cwd?: string, globalDir?: string, global?: boolean } = {}): Promise<ResolvedCommand | null> {
    const cwd = options.cwd || process.cwd();
    const localRoot = !options.global ? findLocalRoot(cwd) : null;
    const globalRoot = options.globalDir || getGlobalRoot();

    const localAgentctl = localRoot ? path.join(localRoot, '.agentctl') : null;

    let currentMatch: ResolvedCommand | null = null;

    // Iterate through args to find longest match
    for (let i = 0; i < args.length; i++) {
        // Path corresponding to args[0..i]
        const currentArgs = args.slice(0, i + 1);
        const relPath = currentArgs.join(path.sep);
        const cmdPath = currentArgs.join(' ');

        const localPath = localAgentctl ? path.join(localAgentctl, relPath) : null;
        const globalPath = path.join(globalRoot, relPath);

        let localManifest: Manifest | null = null;
        let globalManifest: Manifest | null = null;

        // check local
        if (localPath && await fs.pathExists(localPath)) {
            const mPath = path.join(localPath, 'manifest.json');
            if (await fs.pathExists(mPath)) {
                localManifest = await readManifest(mPath);
            }
            if (!localManifest && (await fs.stat(localPath)).isDirectory()) {
                // Implicit group
                localManifest = { name: args[i], type: 'group' };
            }
        }

        // check global
        if (await fs.pathExists(globalPath)) {
            const mPath = path.join(globalPath, 'manifest.json');
            if (await fs.pathExists(mPath)) {
                globalManifest = await readManifest(mPath);
            }
            if (!globalManifest && (await fs.stat(globalPath)).isDirectory()) {
                globalManifest = { name: args[i], type: 'group' };
            }
        }

        if (!localManifest && !globalManifest) {
            break;
        }

        const remainingArgs = args.slice(i + 1);

        // Priority logic
        // 1. Local Capped -> Return Match immediately.
        if (localManifest && isCappedManifest(localManifest)) {
            return {
                manifest: localManifest,
                manifestPath: path.join(localPath!, 'manifest.json'),
                args: remainingArgs,
                scope: 'local',
                cmdPath
            };
        }

        // 2. Global Capped
        if (globalManifest && isCappedManifest(globalManifest)) {
            // Check if shadowed by Local Group
            if (localManifest) {
                // Local exists (must be group since checked capped above).
                // Shadowed. Treat as Local Group.
                currentMatch = {
                    manifest: localManifest,
                    manifestPath: path.join(localPath!, 'manifest.json'),
                    args: remainingArgs,
                    scope: 'local',
                    cmdPath
                };
            } else {
                // Not shadowed. Global Capped wins. Return immediately.
                return {
                    manifest: globalManifest,
                    manifestPath: path.join(globalPath, 'manifest.json'),
                    args: remainingArgs,
                    scope: 'global',
                    cmdPath
                };
            }
        } else {
            // Neither is capped. Both are groups (or one is).
            // Local wins if exists.
            if (localManifest) {
                currentMatch = {
                    manifest: localManifest,
                    manifestPath: path.join(localPath!, 'manifest.json'),
                    args: remainingArgs,
                    scope: 'local',
                    cmdPath
                };
            } else {
                currentMatch = {
                    manifest: globalManifest!,
                    manifestPath: path.join(globalPath, 'manifest.json'),
                    args: remainingArgs,
                    scope: 'global',
                    cmdPath
                };
            }
        }
    }

    return currentMatch;
}
