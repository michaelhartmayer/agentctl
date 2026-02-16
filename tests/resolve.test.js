"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const helpers_1 = require("./helpers");
const resolve_1 = require("../src/resolve");
const ctl_1 = require("../src/ctl");
(0, vitest_1.describe)('resolveCommand', () => {
    let localRoot;
    let globalRoot;
    let baseDir;
    (0, vitest_1.beforeEach)(async () => {
        baseDir = await (0, helpers_1.createTestDir)();
        localRoot = path_1.default.join(baseDir, 'local');
        globalRoot = path_1.default.join(baseDir, 'global');
        await fs_extra_1.default.ensureDir(localRoot);
        await fs_extra_1.default.ensureDir(globalRoot);
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(baseDir);
    });
    (0, vitest_1.it)('resolves local command', async () => {
        // Create local command 'deploy' in localRoot/.agentctl/deploy
        await (0, ctl_1.scaffold)(['deploy'], { cwd: localRoot });
        const result = await (0, resolve_1.resolveCommand)(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result.manifest.name).toBe('deploy');
        (0, vitest_1.expect)(result.scope).toBe('local');
        (0, vitest_1.expect)(result.args).toEqual([]);
    });
    (0, vitest_1.it)('resolves global command', async () => {
        // Create global alias 'gh' in globalRoot/gh
        const cmdDir = path_1.default.join(globalRoot, 'gh');
        await fs_extra_1.default.ensureDir(cmdDir);
        await fs_extra_1.default.writeJson(path_1.default.join(cmdDir, 'manifest.json'), { name: 'gh', type: 'alias', run: 'gh' });
        const result = await (0, resolve_1.resolveCommand)(['gh'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result.manifest.name).toBe('gh');
        (0, vitest_1.expect)(result.scope).toBe('global');
    });
    (0, vitest_1.it)('prioritizes local over global', async () => {
        // Local 'deploy' (manifest type scaffold)
        await (0, ctl_1.scaffold)(['deploy'], { cwd: localRoot });
        // Global 'deploy' (manifest type alias)
        const cmdDir = path_1.default.join(globalRoot, 'deploy');
        await fs_extra_1.default.ensureDir(cmdDir);
        await fs_extra_1.default.writeJson(path_1.default.join(cmdDir, 'manifest.json'), { name: 'deploy', type: 'alias', run: 'echo global' });
        const result = await (0, resolve_1.resolveCommand)(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result.scope).toBe('local');
        // Ensure we got the scaffold manifest (which has type 'scaffold')
        (0, vitest_1.expect)(result.manifest.type).toBe('scaffold');
    });
    (0, vitest_1.it)('returns null if not found', async () => {
        const result = await (0, resolve_1.resolveCommand)(['missing'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('handles nested properties', async () => {
        // Local group 'dev', command 'start'
        await (0, ctl_1.scaffold)(['dev', 'start'], { cwd: localRoot });
        const result = await (0, resolve_1.resolveCommand)(['dev', 'start'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result.manifest.name).toBe('start');
        (0, vitest_1.expect)(result.cmdPath).toBe('dev start'); // Should construct cmdPath?
    });
});
