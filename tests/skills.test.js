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
(0, vitest_1.describe)('ctl install-skill', () => {
    let cwd;
    (0, vitest_1.beforeEach)(async () => {
        cwd = await (0, helpers_1.createTestDir)();
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(cwd);
    });
    (0, vitest_1.it)('installs cursor skill', async () => {
        await (0, ctl_1.installSkill)('cursor', { cwd });
        const skillPath = path_1.default.join(cwd, '.cursor', 'skills', 'agentctl.md');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(skillPath)).toBe(true);
        const content = await fs_extra_1.default.readFile(skillPath, 'utf-8');
        (0, vitest_1.expect)(content).toContain('Agent Controller');
        (0, vitest_1.expect)(content).toContain('agentctl');
    });
    (0, vitest_1.it)('fails for unknown agent', async () => {
        await (0, vitest_1.expect)((0, ctl_1.installSkill)('unknown', { cwd }))
            .rejects.toThrow(/Supported agents/);
    });
});
