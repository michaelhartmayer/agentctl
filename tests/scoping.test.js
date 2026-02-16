"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const helpers_1 = require("./helpers");
const ctl_1 = require("../src/ctl");
(0, vitest_1.describe)('ctl scoping (global, local)', () => {
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
    (0, vitest_1.it)('pushGlobal: copies local to global with --copy', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd: localRoot });
        const localPath = path_1.default.join(localRoot, '.agentctl', 'deploy');
        const globalPath = path_1.default.join(globalRoot, 'deploy');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(localPath)).toBe(true);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(globalPath)).toBe(false);
        await (0, ctl_1.pushGlobal)(['deploy'], { cwd: localRoot, globalDir: globalRoot, copy: true });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(localPath)).toBe(true);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(globalPath)).toBe(true);
        const gManifest = await fs_extra_1.default.readJson(path_1.default.join(globalPath, 'manifest.json'));
        (0, vitest_1.expect)(gManifest.name).toBe('deploy');
    });
    (0, vitest_1.it)('pushGlobal: moves local to global with --move', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd: localRoot });
        const localPath = path_1.default.join(localRoot, '.agentctl', 'deploy');
        const globalPath = path_1.default.join(globalRoot, 'deploy');
        await (0, ctl_1.pushGlobal)(['deploy'], { cwd: localRoot, globalDir: globalRoot, move: true });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(localPath)).toBe(false);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(globalPath)).toBe(true);
    });
    (0, vitest_1.it)('pullLocal: moves global to local', async () => {
        // Setup global manually
        const globalPath = path_1.default.join(globalRoot, 'deploy');
        await fs_extra_1.default.ensureDir(globalPath);
        await fs_extra_1.default.writeJson(path_1.default.join(globalPath, 'manifest.json'), { name: 'deploy', type: 'scaffold' });
        // Ensure local .agentctl exists
        await fs_extra_1.default.ensureDir(path_1.default.join(localRoot, '.agentctl'));
        const localPath = path_1.default.join(localRoot, '.agentctl', 'deploy');
        await (0, ctl_1.pullLocal)(['deploy'], { cwd: localRoot, globalDir: globalRoot, move: true });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(globalPath)).toBe(false);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(localPath)).toBe(true);
    });
});
