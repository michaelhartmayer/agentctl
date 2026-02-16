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
(0, vitest_1.describe)('ctl alias', () => {
    let cwd;
    (0, vitest_1.beforeEach)(async () => {
        cwd = await (0, helpers_1.createTestDir)();
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(cwd);
    });
    (0, vitest_1.it)('creates an alias manifest without script', async () => {
        await (0, ctl_1.alias)(['tools', 'gh'], 'gh', { cwd });
        const cmdDir = path_1.default.join(cwd, '.agentctl', 'tools', 'gh');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdDir)).toBe(true);
        const manifestPath = path_1.default.join(cmdDir, 'manifest.json');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(manifestPath)).toBe(true);
        const manifest = await fs_extra_1.default.readJson(manifestPath);
        (0, vitest_1.expect)(manifest).toEqual(vitest_1.expect.objectContaining({
            name: 'gh',
            type: 'alias',
            run: 'gh',
            description: '',
        }));
        const scriptPath = path_1.default.join(cmdDir, 'command.sh');
        const cmdPath = path_1.default.join(cmdDir, 'command.cmd');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(scriptPath)).toBe(false);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdPath)).toBe(false);
    });
    (0, vitest_1.it)('fails if command already exists', async () => {
        const cmdDir = path_1.default.join(cwd, '.agentctl', 'tools', 'gh');
        await fs_extra_1.default.ensureDir(cmdDir);
        await (0, vitest_1.expect)((0, ctl_1.alias)(['tools', 'gh'], 'gh', { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
