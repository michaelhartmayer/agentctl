import path from 'path';
import fs from 'fs-extra';

export const SUPPORTED_AGENTS = ['cursor', 'antigravity', 'agentsmd', 'gemini'];

export async function copySkill(targetDir: string, agent: string) {
  // We assume the skill file is located at ../skills/agentctl/SKILL.md relative to specific dist/src/ location
  // Or we find it in the project root if running from source.
  // In production (dist), structure might be:
  // dist/index.js
  // skills/agentctl/SKILL.md (if we copy it to dist)

  // Let's try to locate the source SKILL.md
  // If we are in /src, it is in ../skills/agentctl/SKILL.md
  // If we are in /dist/src (tsc default?), it depends on build.

  // Robust finding:
  let sourcePath = path.resolve(__dirname, '../../skills/agentctl/SKILL.md');

  if (!fs.existsSync(sourcePath)) {
    // Try looking in src check (dev mode)
    sourcePath = path.resolve(__dirname, '../skills/agentctl/SKILL.md');
  }

  if (!fs.existsSync(sourcePath)) {
    // Fallback for when running from dist/src
    sourcePath = path.resolve(__dirname, '../../../skills/agentctl/SKILL.md');
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Could not locate source SKILL.md. Checked: ${path.resolve(__dirname, '../../skills/agentctl/SKILL.md')}`);
  }

  await fs.ensureDir(targetDir);

  // Determine filename
  const filename = agent === 'cursor' ? 'agentctl.md' : 'SKILL.md';
  const targetFile = path.join(targetDir, filename);

  await fs.copy(sourcePath, targetFile, { overwrite: true });
  return targetFile;
}
