import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { findLocalRoot, getGlobalRoot } from './fs-utils';
import { readManifest, isCappedManifest, Manifest } from './manifest';
import { resolveCommand } from './resolve';
import { execute } from './effects';
import { Logic, CommandContext } from './logic/ctl';
import { planInstallClone, planInstallCopy } from './logic/install';

export interface ListItem {
    path: string;
    type: string;
    scope: 'local' | 'global';
    description: string;
}

export interface InspectResult {
    manifest: Manifest | null;
    resolvedPath: string;
    scope: 'local' | 'global';
}

async function getCappedAncestor(dir: string, baseDir: string): Promise<{ path: string, relPath: string } | null> {
    let current = path.dirname(dir);
    while (current.length >= baseDir.length && current !== path.dirname(baseDir)) {
        const mPath = path.join(current, 'manifest.json');
        if (await fs.pathExists(mPath)) {
            try {
                const m = await fs.readJson(mPath);
                if (isCappedManifest(m)) {
                    return { path: current, relPath: path.relative(baseDir, current) };
                }
            } catch {
                /* ignore */
            }
        }
        current = path.dirname(current);
    }
    return null;
}

async function getContext(options: { cwd?: string; globalDir?: string }): Promise<CommandContext> {
    const cwd = options.cwd || process.cwd();
    return {
        cwd: path.resolve(cwd),
        platform: process.platform as 'win32' | 'posix' | 'darwin',
        localRoot: findLocalRoot(cwd),
        globalRoot: options.globalDir || getGlobalRoot(),
        homedir: process.env.HOME || process.env.USERPROFILE || os.homedir()
    };
}

export async function scaffold(args: string[], options: { cwd?: string } = {}) {
    const ctx = await getContext(options);
    const localRoot = ctx.localRoot || ctx.cwd;
    const agentctlDir = path.join(localRoot, '.agentctl');
    const targetDir = path.join(agentctlDir, args.join(path.sep));

    const exists = await fs.pathExists(targetDir);
    const cappedAncestor = await getCappedAncestor(targetDir, agentctlDir);

    const { effects } = Logic.planScaffold(args, ctx, { exists, cappedAncestor: cappedAncestor || undefined, type: 'scaffold' });
    await execute(effects);
}

export async function alias(args: string[], target: string, options: { cwd?: string } = {}) {
    const ctx = await getContext(options);
    const localRoot = ctx.localRoot || ctx.cwd;
    const agentctlDir = path.join(localRoot, '.agentctl');
    const targetDir = path.join(agentctlDir, args.join(path.sep));

    const exists = await fs.pathExists(targetDir);
    const cappedAncestor = await getCappedAncestor(targetDir, agentctlDir);

    const { effects } = Logic.planScaffold(args, ctx, {
        exists,
        cappedAncestor: cappedAncestor || undefined,
        type: 'alias',
        target
    });
    await execute(effects);
}

export async function group(args: string[], options: { cwd?: string } = {}) {
    const ctx = await getContext(options);
    const localRoot = ctx.localRoot || ctx.cwd;
    const agentctlDir = path.join(localRoot, '.agentctl');
    const targetDir = path.join(agentctlDir, args.join(path.sep));

    const exists = await fs.pathExists(targetDir);
    const cappedAncestor = await getCappedAncestor(targetDir, agentctlDir);

    const { effects } = Logic.planScaffold(args, ctx, {
        exists,
        cappedAncestor: cappedAncestor || undefined,
        type: 'group'
    });
    await execute(effects);
}

export async function pushGlobal(args: string[], options: { cwd?: string; globalDir?: string; move?: boolean; copy?: boolean } = {}) {
    const ctx = await getContext(options);
    if (!ctx.localRoot) throw new Error('Not in a local context');

    const cmdPathStr = args.join(path.sep);
    const existsInLocal = await fs.pathExists(path.join(ctx.localRoot, '.agentctl', cmdPathStr));
    const existsInGlobal = await fs.pathExists(path.join(ctx.globalRoot, cmdPathStr));

    const effects = Logic.planPushGlobal(args, ctx, {
        move: options.move,
        existsInLocal,
        existsInGlobal
    });
    await execute(effects);
}

export async function pullLocal(args: string[], options: { cwd?: string; globalDir?: string; move?: boolean; copy?: boolean } = {}) {
    const ctx = await getContext(options);
    if (!ctx.localRoot) throw new Error('Not in a local context');

    const cmdPathStr = args.join(path.sep);
    const existsInGlobal = await fs.pathExists(path.join(ctx.globalRoot, cmdPathStr));
    const existsInLocal = await fs.pathExists(path.join(ctx.localRoot, '.agentctl', cmdPathStr));

    const effects = Logic.planPullLocal(args, ctx, {
        move: options.move,
        existsInLocal,
        existsInGlobal
    });
    await execute(effects);
}

export async function rm(args: string[], options: { cwd?: string, globalDir?: string, global?: boolean } = {}) {
    const resolved = await resolveCommand(args, options);
    const ctx = await getContext(options);
    const effects = Logic.planRemove(args, ctx, {
        resolvedPath: resolved?.manifestPath || null,
        scope: resolved?.scope || 'unknown',
        global: options.global
    });
    await execute(effects);
}

export async function mv(srcArgs: string[], destArgs: string[], options: { cwd?: string, globalDir?: string, global?: boolean } = {}) {
    const resolved = await resolveCommand(srcArgs, options);
    const ctx = await getContext(options);

    let rootDir: string | null = null;
    let agentctlDir: string | null = null;
    let destExists = false;
    let cappedAncestor: { relPath: string } | null = null;

    if (resolved) {
        rootDir = resolved.scope === 'local'
            ? findLocalRoot(options.cwd || process.cwd())
            : (options.globalDir || getGlobalRoot());

        if (rootDir) {
            agentctlDir = resolved.scope === 'local' ? path.join(rootDir, '.agentctl') : rootDir;
            const destPathStr = destArgs.join(path.sep);
            const destDir = path.join(agentctlDir, destPathStr);
            destExists = await fs.pathExists(destDir);
            const ancestor = await getCappedAncestor(destDir, agentctlDir);
            if (ancestor) cappedAncestor = { relPath: ancestor.relPath };
        }
    }

    const effects = Logic.planMove(srcArgs, destArgs, ctx, {
        resolvedSrc: resolved ? { manifestPath: resolved.manifestPath, scope: resolved.scope, manifest: resolved.manifest } : null,
        destExists,
        cappedAncestor: cappedAncestor || undefined,
        rootDir,
        agentctlDir
    });
    await execute(effects);
}

export async function inspect(args: string[], options: { cwd?: string, globalDir?: string } = {}): Promise<InspectResult | null> {
    const resolved = await resolveCommand(args, options);
    if (!resolved) return null;
    return {
        manifest: resolved.manifest,
        resolvedPath: resolved.manifestPath,
        scope: resolved.scope
    };
}

export async function installSkill(agent: string, options: { cwd?: string, global?: boolean, antigravityGlobalDir?: string, geminiGlobalDir?: string } = {}) {
    const ctx = await getContext(options);
    const effects = Logic.planInstallSkill(agent, ctx, options);
    await execute(effects);
}

export async function install(repoUrl: string, pathArgs: string[], options: { cwd?: string, global?: boolean, allowCollisions?: boolean } = {}) {
    const ctx = await getContext(options);
    const installCtx = {
        repoUrl,
        pathParts: pathArgs,
        global: !!options.global,
        allowCollisions: !!options.allowCollisions,
        localRoot: ctx.localRoot,
        globalRoot: ctx.globalRoot,
        osTmpdir: os.tmpdir()
    };

    // Phase 1: Clone
    const tempFolderName = `agentctl-install-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const { effects: cloneEffects, tempDir } = planInstallClone(installCtx, { tempFolderName });
    await execute(cloneEffects);

    // Phase 2: Copy
    const tempAgentctlDir = path.join(tempDir, '.agentctl');
    if (!(await fs.pathExists(tempAgentctlDir))) {
        await fs.remove(tempDir);
        throw new Error(`Repository does not contain an .agentctl directory at the root.`);
    }

    const downloadedItems = await fs.readdir(tempAgentctlDir);

    const rootDir = installCtx.global ? installCtx.globalRoot : installCtx.localRoot!;
    const agentctlDir = installCtx.global ? rootDir : path.join(rootDir, '.agentctl');
    const targetDir = path.join(agentctlDir, ...installCtx.pathParts);

    const existingItems = (await fs.pathExists(targetDir)) ? await fs.readdir(targetDir) : [];

    const { effects: copyEffects } = planInstallCopy(installCtx, {
        tempAgentctlDir,
        existingItems,
        downloadedItems
    });

    await execute(copyEffects);
}

export async function list(options: { cwd?: string, globalDir?: string } = {}): Promise<ListItem[]> {
    const ctx = await getContext(options);
    const commands = new Map<string, ListItem>();

    async function walk(dir: string, prefix: string[], scope: 'local' | 'global') {
        if (!await fs.pathExists(dir)) return;
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            let stats;
            try { stats = await fs.stat(filePath); } catch { continue; }
            if (!stats.isDirectory()) continue;

            const cmdPathParts = [...prefix, file];
            const cmdPath = cmdPathParts.join(' ');

            let manifest: Manifest | null = null;
            const mPath = path.join(filePath, 'manifest.json');
            if (await fs.pathExists(mPath)) manifest = await readManifest(mPath);

            let type = 'group';
            if (manifest) {
                if (isCappedManifest(manifest)) type = manifest.type || 'scaffold';
                else if (manifest.type) type = manifest.type;
            }

            const item = { path: cmdPath, type, scope, description: manifest?.description || '' };

            if (!commands.has(cmdPath)) {
                commands.set(cmdPath, item);
                const effectiveManifest = manifest || { name: file, type: 'group' } as Manifest;
                if (!isCappedManifest(effectiveManifest)) await walk(filePath, cmdPathParts, scope);
            } else {
                const existing = commands.get(cmdPath);
                if (existing && existing.scope === 'local' && existing.type === 'group' && type === 'group') {
                    await walk(filePath, cmdPathParts, scope);
                }
            }
        }
    }

    if (ctx.localRoot) await walk(path.join(ctx.localRoot, '.agentctl'), [], 'local');
    await walk(ctx.globalRoot, [], 'global');

    return Array.from(commands.values());
}
