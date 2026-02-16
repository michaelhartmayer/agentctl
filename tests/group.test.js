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
(0, vitest_1.describe)('ctl group', () => {
    let cwd;
    (0, vitest_1.beforeEach)(async () => {
        cwd = await (0, helpers_1.createTestDir)();
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(cwd);
    });
    (0, vitest_1.it)('creates an uncapped command (group) with minimal manifest', async () => {
        await (0, ctl_1.group)(['dev'], { cwd });
        const groupDir = path_1.default.join(cwd, '.agentctl', 'dev');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(groupDir)).toBe(true);
        const manifestPath = path_1.default.join(groupDir, 'manifest.json');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(manifestPath)).toBe(true);
        const manifest = await fs_extra_1.default.readJson(manifestPath);
        (0, vitest_1.expect)(manifest).toEqual(vitest_1.expect.objectContaining({
            name: 'dev',
            type: 'group',
        }));
        (0, vitest_1.expect)(manifest.run).toBeUndefined();
    });
    (0, vitest_1.it)('fails if path exists as capped command', async () => {
        // Create capped command 'dev'
        await (0, ctl_1.scaffold)(['dev'], { cwd });
        await (0, vitest_1.expect)((0, ctl_1.group)(['dev'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
    (0, vitest_1.it)('fails if path exists as directory (group)', async () => {
        await (0, ctl_1.group)(['dev'], { cwd });
        await (0, vitest_1.expect)((0, ctl_1.group)(['dev'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
