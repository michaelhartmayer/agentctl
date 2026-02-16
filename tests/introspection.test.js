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
const ctl_2 = require("../src/ctl");
(0, vitest_1.describe)('ctl introspection', () => {
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
    (0, vitest_1.it)('list commands recursively from both scopes', async () => {
        // Local: dev start (scaffold), tools (group)
        await (0, ctl_2.scaffold)(['dev', 'start'], { cwd: localRoot });
        await fs_extra_1.default.ensureDir(path_1.default.join(localRoot, '.agentctl', 'tools')); // implicit group
        // Global: gh (alias), tools lint (alias)
        const ghDir = path_1.default.join(globalRoot, 'gh');
        await fs_extra_1.default.ensureDir(ghDir);
        await fs_extra_1.default.writeJson(path_1.default.join(ghDir, 'manifest.json'), { name: 'gh', type: 'alias', run: 'gh' });
        const toolsLintDir = path_1.default.join(globalRoot, 'tools', 'lint');
        await fs_extra_1.default.ensureDir(toolsLintDir);
        await fs_extra_1.default.writeJson(path_1.default.join(toolsLintDir, 'manifest.json'), { name: 'lint', type: 'alias', run: 'lint' });
        const results = await (0, ctl_1.list)({ cwd: localRoot, globalDir: globalRoot });
        const paths = results.map(r => r.path).sort();
        (0, vitest_1.expect)(paths).toContain('dev');
        (0, vitest_1.expect)(paths).toContain('dev start');
        (0, vitest_1.expect)(paths).toContain('gh');
        (0, vitest_1.expect)(paths).toContain('tools');
        (0, vitest_1.expect)(paths).toContain('tools lint');
        const dev = results.find(r => r.path === 'dev');
        (0, vitest_1.expect)(dev.scope).toBe('local');
        (0, vitest_1.expect)(dev.type).toBe('group');
        const gh = results.find(r => r.path === 'gh');
        (0, vitest_1.expect)(gh.scope).toBe('global');
        (0, vitest_1.expect)(gh.type).toBe('alias');
        // Ensure tools is merged/handled
        const tools = results.find(r => r.path === 'tools');
        // It resides in both (implicitly in global as parent of lint, explicitly in local).
        // Local wins metadata. It's a group.
        (0, vitest_1.expect)(tools.type).toBe('group');
    });
    (0, vitest_1.it)('inspect shows command details', async () => {
        await (0, ctl_2.scaffold)(['deploy'], { cwd: localRoot });
        const details = await (0, ctl_1.inspect)(['deploy'], { cwd: localRoot, globalDir: globalRoot });
        (0, vitest_1.expect)(details).not.toBeNull();
        (0, vitest_1.expect)(details.manifest.name).toBe('deploy');
        (0, vitest_1.expect)(details.resolvedPath).toContain(path_1.default.join(localRoot, '.agentctl', 'deploy'));
    });
});
