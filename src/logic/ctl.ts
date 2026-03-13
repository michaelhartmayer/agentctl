import path from 'path';
import { Effect } from '../effects';

import { UtilsLogic } from './utils';
import { Manifest } from './manifest';
import { SUPPORTED_AGENTS } from '../skills';

/**
 * STATE/ENVIRONMENT: The minimal data needed for the Brain to make decisions.
 */
export interface CommandContext {
    cwd: string;
    platform: 'win32' | 'posix' | 'darwin';
    localRoot: string | null;
    globalRoot: string;
    homedir: string;
}

/**
 * THE BRAIN: Pure functions that calculate "Plans" (Effect arrays).
 * NO IMPURE IMPORTS (no fs, no os, no process).
 */
export const Logic = {
    planScaffold(args: string[], ctx: CommandContext, options: {
        exists: boolean,
        cappedAncestor?: { path: string, relPath: string },
        type?: 'scaffold' | 'alias' | 'group',
        target?: string,
        missingAncestorGroups?: { dir: string, name: string }[]
    }): { effects: Effect[] } {
        if (args.length === 0) throw new Error('No command path provided');

        if (options.exists) {
            throw new Error(`Command ${args.join(' ')} already exists`);
        }

        if (options.cappedAncestor) {
            throw new Error(`Cannot nest command under capped command: ${options.cappedAncestor.relPath}`);
        }

        const localRoot = ctx.localRoot || ctx.cwd;
        const agentctlDir = path.join(localRoot, '.agentctl');
        const cmdPath = args.join(path.sep);
        const targetDir = path.join(agentctlDir, cmdPath);
        const name = args[args.length - 1];

        const type = options.type || 'scaffold';
        const isWin = ctx.platform === 'win32';
        const effects: Effect[] = [{ type: 'mkdir', path: targetDir }];

        for (const group of options.missingAncestorGroups || []) {
            effects.push({
                type: 'writeJson',
                path: path.join(group.dir, 'manifest.json'),
                content: { name: group.name, type: 'group' }
            });
        }

        const manifest: Manifest = {
            name,
            description: '<insert summary>',
            help: '<insert usage/help instructions>',
            type,
        };

        if (type === 'scaffold') {
            const scriptName = isWin ? 'command.cmd' : 'command.sh';
            const scriptPath = path.join(targetDir, scriptName);
            const scriptContent = isWin
                ? '@echo off\r\nREM Add your command logic here\r\necho Not implemented'
                : '#!/usr/bin/env bash\n# Add your command logic here\necho "Not implemented"';

            manifest.run = `./${scriptName}`;
            effects.push({ type: 'writeFile', path: scriptPath, content: scriptContent });
            if (!isWin) effects.push({ type: 'chmod', path: scriptPath, mode: 0o755 });
        } else if (type === 'alias') {
            manifest.run = options.target;
        }

        effects.push({ type: 'writeJson', path: path.join(targetDir, 'manifest.json'), content: manifest });

        const logMsg = type === 'scaffold' ? `Scaffolded command: ${args.join(' ')}` :
            type === 'alias' ? `Aliased command: ${args.join(' ')} -> ${options.target}` :
                `Created group: ${args.join(' ')}`;

        effects.push({ type: 'log', message: logMsg });

        return { effects };
    },

    planPushGlobal(args: string[], ctx: CommandContext, options: { move?: boolean; existsInGlobal: boolean; existsInLocal: boolean }): Effect[] {
        if (!ctx.localRoot) throw new Error('Not in a local context');
        if (!options.existsInLocal) throw new Error(`Local command ${args.join(' ')} not found`);
        if (options.existsInGlobal) throw new Error(`Global command ${args.join(' ')} already exists`);

        const cmdPathStr = args.join(path.sep);
        const srcDir = path.join(ctx.localRoot, '.agentctl', cmdPathStr);
        const destDir = path.join(ctx.globalRoot, cmdPathStr);

        const effects: Effect[] = [
            { type: 'mkdir', path: path.dirname(destDir) }
        ];

        if (options.move) {
            effects.push({ type: 'move', src: srcDir, dest: destDir });
            effects.push({ type: 'log', message: `Moved ${args.join(' ')} to global scope` });
        } else {
            effects.push({ type: 'copy', src: srcDir, dest: destDir });
            effects.push({ type: 'log', message: `Copied ${args.join(' ')} to global scope` });
        }

        return effects;
    },

    planPullLocal(args: string[], ctx: CommandContext, options: { move?: boolean; existsInGlobal: boolean; existsInLocal: boolean }): Effect[] {
        if (!ctx.localRoot) throw new Error('Not in a local context');
        if (!options.existsInGlobal) throw new Error(`Global command ${args.join(' ')} not found`);
        if (options.existsInLocal) throw new Error(`Local command ${args.join(' ')} already exists`);

        const cmdPathStr = args.join(path.sep);
        const srcDir = path.join(ctx.globalRoot, cmdPathStr);
        const destDir = path.join(ctx.localRoot, '.agentctl', cmdPathStr);

        const effects: Effect[] = [
            { type: 'mkdir', path: path.dirname(destDir) }
        ];

        if (options.move) {
            effects.push({ type: 'move', src: srcDir, dest: destDir });
            effects.push({ type: 'log', message: `Moved ${args.join(' ')} to local scope` });
        } else {
            effects.push({ type: 'copy', src: srcDir, dest: destDir });
            effects.push({ type: 'log', message: `Copied ${args.join(' ')} to local scope` });
        }

        return effects;
    },

    planRemove(args: string[], ctx: CommandContext, options: { resolvedPath: string | null, scope: string, global?: boolean }): Effect[] {
        if (!options.resolvedPath) {
            throw new Error(`Command ${args.join(' ')} not found${options.global ? ' in global scope' : ''}`);
        }

        const targetDir = path.dirname(options.resolvedPath);
        return [
            { type: 'remove', path: targetDir },
            { type: 'log', message: `Removed ${options.scope} command: ${args.join(' ')}` }
        ];
    },

    planMove(srcArgs: string[], destArgs: string[], ctx: CommandContext, options: {
        resolvedSrc: { manifestPath: string, scope: 'local' | 'global', manifest: Manifest } | null,
        destExists: boolean,
        cappedAncestor?: { relPath: string },
        rootDir: string | null,
        agentctlDir: string | null
    }): Effect[] {
        if (!options.resolvedSrc) throw new Error(`Command ${srcArgs.join(' ')} not found`);
        if (!options.rootDir || !options.agentctlDir) throw new Error('Cannot determine root for move');
        if (options.destExists) throw new Error(`Destination ${destArgs.join(' ')} already exists`);
        if (options.cappedAncestor) throw new Error(`Cannot nest command under capped command: ${options.cappedAncestor.relPath}`);

        const srcDir = path.dirname(options.resolvedSrc.manifestPath);
        const destPathStr = destArgs.join(path.sep);
        const destDir = path.join(options.agentctlDir, destPathStr);

        const effects: Effect[] = [
            { type: 'move', src: srcDir, dest: destDir }
        ];

        const updatedManifest = { ...options.resolvedSrc.manifest, name: destArgs[destArgs.length - 1] };
        effects.push({ type: 'writeJson', path: path.join(destDir, 'manifest.json'), content: updatedManifest });
        effects.push({ type: 'log', message: `Moved ${srcArgs.join(' ')} to ${destArgs.join(' ')}` });

        return effects;
    },

    planInstallSkill(agent: string, ctx: CommandContext, options: {
        global?: boolean,
        antigravityGlobalDir?: string,
        geminiGlobalDir?: string
    }): Effect[] {
        if (!SUPPORTED_AGENTS.includes(agent)) {
            throw new Error(`Agent '${agent}' not supported. Supported agents: ${SUPPORTED_AGENTS.join(', ')}`);
        }

        let targetDir: string;

        if (agent === 'cursor') {
            targetDir = path.join(ctx.cwd, '.cursor', 'skills');
        } else if (agent === 'antigravity') {
            if (options.global) {
                const globalRoot = options.antigravityGlobalDir || UtilsLogic.getAntigravityGlobalRoot({
                    platform: ctx.platform,
                    env: {}, // UtilsLogic should probably take full ctx or we just use ctx.homedir
                    homedir: ctx.homedir
                });
                targetDir = path.join(globalRoot, 'skills', 'agentctl');
            } else {
                targetDir = path.join(ctx.cwd, '.agent', 'skills', 'agentctl');
            }
        } else if (agent === 'agentsmd') {
            targetDir = path.join(ctx.cwd, '.agents', 'skills', 'agentctl');
        } else if (agent === 'gemini') {
            if (options.global) {
                const globalRoot = options.geminiGlobalDir || path.join(ctx.homedir, '.gemini');
                targetDir = path.join(globalRoot, 'skills', 'agentctl');
            } else {
                targetDir = path.join(ctx.cwd, '.gemini', 'skills', 'agentctl');
            }
        } else {
            throw new Error(`Agent logic for '${agent}' not implemented.`);
        }

        return [{ type: 'installSkill', targetDir, agent }];
    }
};
