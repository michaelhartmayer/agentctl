import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { createTestDir, cleanupTestDir } from './helpers';
import { installSkill } from '../src/ctl';

describe('ctl install-skill', () => {
    let cwd: string;
    beforeEach(async () => {
        cwd = await createTestDir();
    });
    afterEach(async () => {
        await cleanupTestDir(cwd);
    });

    it('installs cursor skill', async () => {
        await installSkill('cursor', { cwd });

        const skillPath = path.join(cwd, '.cursor', 'skills', 'agentctl.md');
        expect(await fs.pathExists(skillPath)).toBe(true);
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content).toContain('Agent Controller');
        expect(content).toContain('agentctl');
    });

    it('installs agentsmd skill', async () => {
        await installSkill('agentsmd', { cwd });

        const skillPath = path.join(cwd, '.agents', 'skills', 'agentctl', 'SKILL.md');
        expect(await fs.pathExists(skillPath)).toBe(true);
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content).toContain('name: agentctl');
        expect(content).toContain('Usage for AgentsMD'); // Wait, the generator didn't include this specific header, let's check generic content
        expect(content).toContain('# Agent Controller');
    });

    it('installs gemini skill', async () => {
        await installSkill('gemini', { cwd });

        const skillPath = path.join(cwd, '.gemini', 'skills', 'agentctl', 'SKILL.md');
        expect(await fs.pathExists(skillPath)).toBe(true);
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content).toContain('name: agentctl');
        expect(content).toContain('Usage for Gemini');
    });

    it('installs gemini skill globally', async () => {
        const globalDir = path.join(cwd, 'global-gemini');
        await installSkill('gemini', { cwd, global: true, geminiGlobalDir: globalDir });

        const skillPath = path.join(globalDir, 'skills', 'agentctl', 'SKILL.md');
        expect(await fs.pathExists(skillPath)).toBe(true);
        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content).toContain('Usage for Gemini');
    });

    it('fails for unknown agent', async () => {
        await expect(installSkill('unknown', { cwd }))
            .rejects.toThrow(/Supported agents/);
    });
});
