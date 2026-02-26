import path from 'path';
import fs from 'fs-extra';
import { findLocalRoot, getGlobalRoot } from './fs-utils';
import { Manifest, readManifest, isCappedManifest } from './manifest';
import { ResolveLogic, PathFacts } from './logic/resolve';

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

    for (let i = 0; i < args.length; i++) {
        const currentArgs = args.slice(0, i + 1);
        const relPath = currentArgs.join(path.sep);
        const cmdPath = currentArgs.join(' ');

        const localPath = localAgentctl ? path.join(localAgentctl, relPath) : null;
        const globalPath = path.join(globalRoot, relPath);

        const getFacts = async (p: string | null): Promise<PathFacts | null> => {
            if (!p || !(await fs.pathExists(p))) return null;
            const mPath = path.join(p, 'manifest.json');
            let manifest: Manifest | null = null;
            if (await fs.pathExists(mPath)) {
                manifest = await readManifest(mPath);
            }
            const stats = await fs.stat(p);
            const isDir = stats.isDirectory();
            if (!manifest && isDir) {
                manifest = { name: args[i], type: 'group' };
            }
            return { exists: true, manifest, isDir, path: mPath };
        };

        const localFacts = await getFacts(localPath);
        const globalFacts = (await getFacts(globalPath)) || { exists: false, manifest: null, isDir: false, path: path.join(globalPath, 'manifest.json') };

        const decision = ResolveLogic.decide(localFacts, globalFacts, isCappedManifest);

        const remainingArgs = args.slice(i + 1);

        if (decision.finalResult) {
            return {
                manifest: decision.finalResult.manifest,
                manifestPath: decision.finalResult.manifestPath,
                args: remainingArgs,
                scope: decision.finalResult.scope,
                cmdPath
            };
        }

        if (decision.currentMatch) {
            currentMatch = {
                manifest: decision.currentMatch.manifest,
                manifestPath: decision.currentMatch.manifestPath,
                args: remainingArgs,
                scope: decision.currentMatch.scope,
                cmdPath
            };
        }

        if (decision.shouldStop) {
            break;
        }
    }

    return currentMatch;
}
