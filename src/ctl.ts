import fs from 'fs-extra';
import path from 'path';
import { resolveCommand } from './resolve';
import { findLocalRoot, getGlobalRoot, getAntigravityGlobalRoot } from './fs-utils';
import { readManifest, isCappedManifest, Manifest } from './manifest';

export async function scaffold(args: string[], options: { cwd?: string } = {}) {
    const { targetDir, name, isWin } = await prepareCommand(args, options);

    const scriptName = isWin ? 'command.cmd' : 'command.sh';
    const scriptPath = path.join(targetDir, scriptName);
    const scriptContent = isWin
        ? '@echo off\r\nREM Add your command logic here\r\necho Not implemented'
        : '#!/usr/bin/env bash\n# Add your command logic here\necho "Not implemented"';

    await fs.writeFile(scriptPath, scriptContent);
    if (!isWin) await fs.chmod(scriptPath, 0o755);

    const manifest = {
        name,
        description: '',
        type: 'scaffold' as const,
        run: `./${scriptName}`,
    };
    await fs.writeJson(path.join(targetDir, 'manifest.json'), manifest, { spaces: 2 });
    console.log(`Scaffolded command: ${args.join(' ')}`);
}

export async function alias(args: string[], target: string, options: { cwd?: string } = {}) {
    const { targetDir, name } = await prepareCommand(args, options);

    const manifest = {
        name,
        description: '',
        type: 'alias' as const,
        run: target,
    };
    await fs.writeJson(path.join(targetDir, 'manifest.json'), manifest, { spaces: 2 });
    console.log(`Aliased command: ${args.join(' ')} -> ${target}`);
}

export async function group(args: string[], options: { cwd?: string } = {}) {
    const { targetDir, name } = await prepareCommand(args, options);

    const manifest = {
        name,
        description: '',
        type: 'group' as const,
    };
    await fs.writeJson(path.join(targetDir, 'manifest.json'), manifest, { spaces: 2 });
    console.log(`Created group: ${args.join(' ')}`);
}


export async function pushGlobal(args: string[], options: { cwd?: string, globalDir?: string, move?: boolean, copy?: boolean } = {}) {
    const cwd = options.cwd || process.cwd();
    const localRoot = findLocalRoot(cwd);
    if (!localRoot) throw new Error('Not in a local context');
    const globalRoot = options.globalDir || getGlobalRoot();

    const localAgentctl = path.join(localRoot, '.agentctl');
    const cmdPathStr = args.join(path.sep);
    const srcDir = path.join(localAgentctl, cmdPathStr);

    if (!await fs.pathExists(srcDir)) {
        throw new Error(`Local command ${args.join(' ')} not found`);
    }

    const destDir = path.join(globalRoot, cmdPathStr);

    if (await fs.pathExists(destDir)) {
        throw new Error(`Global command ${args.join(' ')} already exists`);
    }

    await fs.ensureDir(path.dirname(destDir));
    if (options.move) {
        await fs.move(srcDir, destDir);
        console.log(`Moved ${args.join(' ')} to global scope`);
    } else {
        await fs.copy(srcDir, destDir);
        console.log(`Copied ${args.join(' ')} to global scope`);
    }
}

export async function pullLocal(args: string[], options: { cwd?: string, globalDir?: string, move?: boolean, copy?: boolean } = {}) {
    const cwd = options.cwd || process.cwd();
    const localRoot = findLocalRoot(cwd);
    if (!localRoot) throw new Error('Not in a local context');
    const globalRoot = options.globalDir || getGlobalRoot();

    const cmdPathStr = args.join(path.sep);
    const srcDir = path.join(globalRoot, cmdPathStr);

    if (!await fs.pathExists(srcDir)) {
        throw new Error(`Global command ${args.join(' ')} not found`);
    }

    const localAgentctl = path.join(localRoot, '.agentctl');
    const destDir = path.join(localAgentctl, cmdPathStr);

    if (await fs.pathExists(destDir)) {
        throw new Error(`Local command ${args.join(' ')} already exists`);
    }

    await fs.ensureDir(path.dirname(destDir));
    if (options.move) {
        await fs.move(srcDir, destDir);
        console.log(`Moved ${args.join(' ')} to local scope`);
    } else {
        await fs.copy(srcDir, destDir);
        console.log(`Copied ${args.join(' ')} to local scope`);
    }
}


import { generateCursorSkill, generateAntigravitySkill, generateAgentsMdSkill, generateGeminiSkill, SUPPORTED_AGENTS } from './skills';

export async function installSkill(agent: string, options: { cwd?: string, global?: boolean, antigravityGlobalDir?: string, geminiGlobalDir?: string } = {}) {
    const cwd = options.cwd || process.cwd();

    if (!SUPPORTED_AGENTS.includes(agent)) {
        throw new Error(`Agent '${agent}' not supported. Supported agents: ${SUPPORTED_AGENTS.join(', ')}`);
    }

    let targetDir: string;

    if (agent === 'cursor') {
        targetDir = path.join(cwd, '.cursor', 'skills');
        const p = await generateCursorSkill(targetDir);
        console.log(`Installed skill for ${agent} at ${p}`);
    } else if (agent === 'antigravity') {
        if (options.global) {
            const globalRoot = options.antigravityGlobalDir || getAntigravityGlobalRoot();
            targetDir = path.join(globalRoot, 'skills', 'agentctl');
        } else {
            targetDir = path.join(cwd, '.agent', 'skills', 'agentctl');
        }
        const p = await generateAntigravitySkill(targetDir);
        console.log(`Installed skill for ${agent} at ${p}`);
    } else if (agent === 'agentsmd') {
        // agentsmd spec typically uses .agents/skills/
        targetDir = path.join(cwd, '.agents', 'skills', 'agentctl');
        const p = await generateAgentsMdSkill(targetDir);
        console.log(`Installed skill for ${agent} at ${p}`);
    } else if (agent === 'gemini') {
        if (options.global) {
            const globalRoot = options.geminiGlobalDir || path.join(process.env.HOME || process.env.USERPROFILE!, '.gemini');
            targetDir = path.join(globalRoot, 'skills', 'agentctl');
        } else {
            targetDir = path.join(cwd, '.gemini', 'skills', 'agentctl');
        }
        const p = await generateGeminiSkill(targetDir);
        console.log(`Installed skill for ${agent} at ${p}`);
    }
}

export async function rm(args: string[], options: { cwd?: string, globalDir?: string, global?: boolean } = {}) {
    const resolved = await resolveCommand(args, options);
    if (!resolved) {
        throw new Error(`Command ${args.join(' ')} not found${options.global ? ' in global scope' : ''}`);
    }

    const targetDir = path.dirname(resolved.manifestPath);
    await fs.remove(targetDir);
    console.log(`Removed ${resolved.scope} command: ${args.join(' ')}`);
}

export async function mv(srcArgs: string[], destArgs: string[], options: { cwd?: string, globalDir?: string, global?: boolean } = {}) {
    const resolved = await resolveCommand(srcArgs, options);
    if (!resolved) {
        throw new Error(`Command ${srcArgs.join(' ')} not found`);
    }

    const srcDir = path.dirname(resolved.manifestPath);

    const rootDir = resolved.scope === 'local'
        ? findLocalRoot(options.cwd || process.cwd())
        : (options.globalDir || getGlobalRoot());

    if (!rootDir) throw new Error('Cannot determine root for move');

    const agentctlDir = resolved.scope === 'local' ? path.join(rootDir, '.agentctl') : rootDir;
    // For global, rootDir IS the agentctl dir (config dir). Local has .agentctl subdir.

    const destPathStr = destArgs.join(path.sep);
    const destDir = path.join(agentctlDir, destPathStr);

    if (await fs.pathExists(destDir)) {
        throw new Error(`Destination ${destArgs.join(' ')} already exists`);
    }

    // Check parent validity (nesting under capped)
    let current = path.dirname(destDir);
    while (current.length >= agentctlDir.length && !isSamePath(current, path.dirname(agentctlDir))) {
        if (await isCapped(current)) {
            const relPath = path.relative(agentctlDir, current); // relative to base
            throw new Error(`Cannot nest command under capped command: ${relPath}`);
        }
        current = path.dirname(current);
    }

    await fs.move(srcDir, destDir);

    // Update manifest name
    const manifestPath = path.join(destDir, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        manifest.name = destArgs[destArgs.length - 1];
        await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    }

    console.log(`Moved ${srcArgs.join(' ')} to ${destArgs.join(' ')}`);
}

export async function inspect(args: string[], options: { cwd?: string, globalDir?: string } = {}): Promise<any> {
    const resolved = await resolveCommand(args, options);
    if (!resolved) {
        return null;
    }
    return {
        manifest: resolved.manifest,
        resolvedPath: resolved.manifestPath,
        scope: resolved.scope
    };
}

export async function list(options: { cwd?: string, globalDir?: string } = {}): Promise<any[]> {
    const cwd = options.cwd || process.cwd();
    const localRoot = findLocalRoot(cwd);
    const globalRoot = options.globalDir || getGlobalRoot();

    const commands = new Map<string, any>();

    async function walk(dir: string, prefix: string[], scope: 'local' | 'global') {
        if (!await fs.pathExists(dir)) return;

        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            let stats;
            try {
                stats = await fs.stat(filePath);
            } catch { continue; }

            if (!stats.isDirectory()) continue;

            const cmdPathParts = [...prefix, file];
            const cmdPath = cmdPathParts.join(' ');

            let manifest: Manifest | null = null;
            const mPath = path.join(filePath, 'manifest.json');
            if (await fs.pathExists(mPath)) {
                manifest = await readManifest(mPath);
            }

            let type = 'group';
            if (manifest) {
                if (isCappedManifest(manifest)) {
                    type = manifest.type || 'scaffold';
                } else if (manifest.type) {
                    type = manifest.type;
                }
            }

            const item = {
                path: cmdPath,
                type,
                scope,
                description: manifest?.description || ''
            };

            if (!commands.has(cmdPath)) {
                commands.set(cmdPath, item);
                const effectiveManifest = manifest || { name: file, type: 'group' } as Manifest;
                if (!isCappedManifest(effectiveManifest)) {
                    await walk(filePath, cmdPathParts, scope);
                }
            } else {
                const existing = commands.get(cmdPath);
                if (existing.scope === 'local') {
                    if (existing.type === 'group' && type === 'group') {
                        await walk(filePath, cmdPathParts, scope);
                    }
                }
            }
        }
    }

    if (localRoot) {
        await walk(path.join(localRoot, '.agentctl'), [], 'local');
    }
    await walk(globalRoot, [], 'global');

    return Array.from(commands.values());
}

// Helpers
async function prepareCommand(args: string[], options: { cwd?: string } = {}) {
    const cwd = options.cwd || process.cwd();
    const rootDir = cwd;
    const agentctlDir = path.join(rootDir, '.agentctl');

    if (args.length === 0) throw new Error('No command path provided');

    const cmdPath = args.join(path.sep);
    const targetDir = path.join(agentctlDir, cmdPath);

    if (await fs.pathExists(targetDir)) {
        throw new Error(`Command ${args.join(' ')} already exists`);
    }

    let current = path.dirname(targetDir);
    while (current.length >= agentctlDir.length && !isSamePath(current, path.dirname(agentctlDir))) {
        if (await isCapped(current)) {
            const relPath = path.relative(agentctlDir, current); // This uses cwd for resolution if agentctlDir is cwd resolved
            // Need to verify relative works predictably
            // agentctlDir comes from path.join(cwd, '.agentctl').
            throw new Error(`Cannot nest command under capped command: ${relPath}`);
        }
        current = path.dirname(current);
    }

    await fs.ensureDir(targetDir);

    return {
        targetDir,
        name: args[args.length - 1],
        isWin: process.platform === 'win32'
    };
}

async function isCapped(dir: string): Promise<boolean> {
    const manifestPath = path.join(dir, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
        try {
            const m = await fs.readJson(manifestPath);
            return isCappedManifest(m);
        } catch {
            return false;
        }
    }
    return false;
}

function isSamePath(p1: string, p2: string) {
    return path.relative(p1, p2) === '';
}
