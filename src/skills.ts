import fs from 'fs-extra';
import { SkillsLogic } from './logic/skills';

export const SUPPORTED_AGENTS = ['cursor', 'antigravity', 'agentsmd', 'gemini'];

export async function copySkill(targetDir: string, agent: string) {
  const sources = SkillsLogic.getSourcePaths({ dirname: __dirname });

  let sourcePath: string | null = null;
  for (const p of sources) {
    if (fs.existsSync(p)) {
      sourcePath = p;
      break;
    }
  }

  if (!sourcePath) {
    throw new Error(`Could not locate source SKILL.md. Checked: ${sources[0]}`);
  }

  await fs.ensureDir(targetDir);
  const targetFile = SkillsLogic.getTargetPath(targetDir, agent);

  await fs.copy(sourcePath, targetFile, { overwrite: true });
  return targetFile;
}
