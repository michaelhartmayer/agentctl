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
(0, vitest_1.describe)('ctl scaffold', () => {
    let cwd;
    (0, vitest_1.beforeEach)(async () => {
        cwd = await (0, helpers_1.createTestDir)();
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, helpers_1.cleanupTestDir)(cwd);
    });
    (0, vitest_1.it)('creates a capped command with manifest and script', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd });
        const cmdDir = path_1.default.join(cwd, '.agentctl', 'deploy');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdDir)).toBe(true);
        const manifestPath = path_1.default.join(cmdDir, 'manifest.json');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(manifestPath)).toBe(true);
        const manifest = await fs_extra_1.default.readJson(manifestPath);
        (0, vitest_1.expect)(manifest).toEqual(vitest_1.expect.objectContaining({
            name: 'deploy',
            type: 'scaffold',
            description: '',
        }));
        const scriptPath = path_1.default.join(cmdDir, manifest.run);
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(scriptPath)).toBe(true);
        const scriptContent = await fs_extra_1.default.readFile(scriptPath, 'utf-8');
        if (process.platform === 'win32') {
            (0, vitest_1.expect)(scriptContent).toContain('@echo off');
        }
        else {
            (0, vitest_1.expect)(scriptContent).toContain('#!/usr/bin/env');
        }
    });
    (0, vitest_1.it)('creates nested commands implicitly creating groups', async () => {
        await (0, ctl_1.scaffold)(['dev', 'start'], { cwd });
        const groupDir = path_1.default.join(cwd, '.agentctl', 'dev');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(groupDir)).toBe(true);
        const cmdDir = path_1.default.join(groupDir, 'start');
        (0, vitest_1.expect)(await fs_extra_1.default.pathExists(cmdDir)).toBe(true);
    });
    (0, vitest_1.it)('fails if command already exists', async () => {
        await (0, ctl_1.scaffold)(['deploy'], { cwd });
        await (0, vitest_1.expect)((0, ctl_1.scaffold)(['deploy'], { cwd }))
            .rejects.toThrow(/already exists/);
    });
});
