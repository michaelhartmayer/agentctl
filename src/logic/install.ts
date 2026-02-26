import path from 'path';
import { Effect } from '../effects';

export interface InstallContext {
    repoUrl: string;
    pathParts: string[];
    global: boolean;
    allowCollisions: boolean;
    localRoot: string | null;
    globalRoot: string;
    osTmpdir: string;
}

export function planInstallClone(ctx: InstallContext, deps: { tempFolderName: string }): { effects: Effect[], tempDir: string } {
    if (!ctx.global && !ctx.localRoot) {
        throw new Error('Not in a local context. Run inside a project or use --global');
    }

    const tempDir = path.join(ctx.osTmpdir, deps.tempFolderName);

    const effects: Effect[] = [];

    // 1. Create a log message
    effects.push({
        type: 'log',
        message: `Fetching ${ctx.repoUrl}...`
    });

    // 2. Clone the repository shallowly into a temp directory
    effects.push({
        type: 'gitClone',
        url: ctx.repoUrl,
        dest: tempDir
    });

    return { effects, tempDir };
}

export function planInstallCopy(ctx: InstallContext, deps: {
    tempAgentctlDir: string;
    existingItems: string[];
    downloadedItems: string[];
}): { effects: Effect[] } {
    if (!ctx.global && !ctx.localRoot) {
        throw new Error('Not in a local context. Run inside a project or use --global');
    }
    const rootDir = ctx.global ? ctx.globalRoot : ctx.localRoot!;
    const agentctlDir = ctx.global ? rootDir : path.join(rootDir, '.agentctl');
    const targetDir = path.join(agentctlDir, ...ctx.pathParts);

    const effects: Effect[] = [];

    if (!ctx.allowCollisions) {
        // Simple collision detection based on paths relative to targetDir
        const collisions = deps.existingItems.filter(item => deps.downloadedItems.includes(item));
        if (collisions.length > 0) {
            effects.push({ type: 'remove', path: path.dirname(deps.tempAgentctlDir) }); // cleanup
            throw new Error(`Installation aborted due to collisions without --allow-collisions flag: \n${collisions.join('\n')}`);
        }
    }

    // Ensure target path exists
    effects.push({ type: 'mkdir', path: targetDir });

    // Copy contents
    effects.push({
        type: 'copy',
        src: deps.tempAgentctlDir,
        dest: targetDir,
        options: { overwrite: ctx.allowCollisions }
    });

    // Clean up temp dir
    effects.push({ type: 'remove', path: path.dirname(deps.tempAgentctlDir) });

    effects.push({ type: 'log', message: `Successfully installed commands to ${targetDir}` });

    return { effects };
}
