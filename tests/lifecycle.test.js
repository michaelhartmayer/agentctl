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
(0, vitest_1.describe)('ctl lifecycle (rm, mv)', () => {
    let cwd;
    (0, vitest_1.beforeEach)(async () => {
        cwd = await (0, helpers_1.createTestDir)();
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(cwd);
    });
    (0, vitest_1.it)('rm: removes command logic', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd });
        const cmdDir = path_1.default.join(cwd, '.agentctl', 'deploy');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdDir)).toBe(true);
        await (0, ctl_1.rm)(['deploy'], { cwd });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdDir)).toBe(false);
    });
    (0, vitest_1.it)('rm: removes group', async () => {
        await (0, ctl_1.scaffold)(['dev', 'start'], { cwd });
        const devDir = path_1.default.join(cwd, '.agentctl', 'dev');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(devDir)).toBe(true);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(path_1.default.join(devDir, 'start'))).toBe(true);
        await (0, ctl_1.rm)(['dev'], { cwd });
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(devDir)).toBe(false);
    });
    (0, vitest_1.it)('mv: moves command and updates name', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd });
        const oldDir = path_1.default.join(cwd, '.agentctl', 'deploy');
        const manifestPath = path_1.default.join(oldDir, 'manifest.json');
        (0, vitest_1.expect)((await fs_extra_1.default.readJson(manifestPath)).name).toBe('deploy');
        // Move deploy -> release
        await (0, ctl_1.mv)(['deploy'], ['release'], { cwd });
        const newDir = path_1.default.join(cwd, '.agentctl', 'release');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(oldDir)).toBe(false);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(newDir)).toBe(true);
        const newManifest = await fs_extra_1.default.readJson(path_1.default.join(newDir, 'manifest.json'));
        (0, vitest_1.expect)(newManifest.name).toBe('release');
    });
    (0, vitest_1.it)('mv: fails if destination exists', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd });
        await (0, ctl_1.scaffold)(['release'], { cwd });
        await (0, vitest_1.expect)((0, ctl_1.mv)(['deploy'], ['release'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
