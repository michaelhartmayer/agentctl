import path from 'path';
import fs from 'fs-extra';

export const SUPPORTED_AGENTS = ['cursor', 'antigravity', 'agentsmd', 'gemini'];

export async function generateCursorSkill(targetDir: string) {
  const skillContent = `# Agent Controller (agentctl)

Agent Controller is a CLI tool that helps you discover and execute commands within this project.

## Usage

- **List Commands**: \`agentctl ctl list\`
  - Lists all available commands with their type and scope.
  
- **Inspect Command**: \`agentctl ctl inspect <command>\`
  - Shows details about a specific command.

- **Run Command**: \`agentctl <command> [args...]\`
  - Executes the specified command.

## Core Commands

- \`ctl scaffold <path>\`: Create a new command stub.
- \`ctl alias <name> <target>\`: Create a command alias.
- \`ctl register:path\`: Add agentctl to system PATH.

Use this tool to explore the capabilities of this project!
`;

  await fs.ensureDir(targetDir);
  const targetFile = path.join(targetDir, 'agentctl.md');
  await fs.writeFile(targetFile, skillContent);
  return targetFile;
}

export async function generateAntigravitySkill(targetDir: string) {
  const skillContent = `---
name: agentctl
description: Agent Controller - A unified interface for project-specific commands and automation.
---

# Agent Controller (agentctl)

Agent Controller is a CLI tool used to manage and execute project-specific commands. It supports local project-scoped commands and global user-scoped commands.

## Capabilities

- **Command Discovery**: Use \`agentctl ctl list\` to see all available commands.
- **Command Scaffolding**: Create new commands using \`agentctl ctl scaffold <path>\`.
- **Global/Local Management**: Push commands to global scope with \`agentctl ctl global <path>\` or pull to local with \`agentctl ctl local <path>\`.
- **Command Execution**: Run any command via \`agentctl <path> [args...]\`.

## Usage for Antigravity

When you need to perform repetitive tasks or use project-specific tooling, check \`agentctl ctl list\` first. 
The commands usually wrap shell scripts or other binaries, providing a clean interface.

### Example
To create a new deployment script:
1. \`agentctl ctl scaffold deploy\`
2. Edit the generated \`command.sh\` or \`command.cmd\` in \`.agentctl/deploy/\`.
3. Run it with \`agentctl deploy\`.
`;

  await fs.ensureDir(targetDir);
  const targetFile = path.join(targetDir, 'SKILL.md');
  await fs.writeFile(targetFile, skillContent);
  return targetFile;
}

export async function generateAgentsMdSkill(targetDir: string) {
  const skillContent = `---
name: agentctl
description: Agent Controller - A unified interface for project-specific commands and automation.
---

# Agent Controller (agentctl)

Agent Controller is a CLI tool used to manage and execute project-specific commands.

## Capabilities

- **Command Discovery**: Use \`agentctl ctl list\` to see all available commands.
- **Command Scaffolding**: Create new commands using \`agentctl ctl scaffold <path>\`.
- **Global/Local Management**: Push commands to global scope with \`agentctl ctl global <path>\` or pull to local with \`agentctl ctl local <path>\`.
- **Command Execution**: Run any command via \`agentctl <path> [args...]\`.

## Usage for AgentsMD

When you need to perform repetitive tasks or use project-specific tooling, check \`agentctl ctl list\` first.
The commands usually wrap shell scripts or other binaries, providing a clean interface.
`;

  await fs.ensureDir(targetDir);
  const targetFile = path.join(targetDir, 'SKILL.md');
  await fs.writeFile(targetFile, skillContent);
  return targetFile;
}

export async function generateGeminiSkill(targetDir: string) {
  const skillContent = `---
name: agentctl
description: Agent Controller - A unified interface for project-specific commands and automation.
---

# Agent Controller (agentctl)

Agent Controller is a CLI tool used to manage and execute project-specific commands.

## Capabilities

- **Command Discovery**: Use \`agentctl ctl list\` to see all available commands.
- **Command Scaffolding**: Create new commands using \`agentctl ctl scaffold <path>\`.
- **Global/Local Management**: Push commands to global scope with \`agentctl ctl global <path>\` or pull to local with \`agentctl ctl local <path>\`.
- **Command Execution**: Run any command via \`agentctl <path> [args...]\`.

## Usage for Gemini

When you need to perform repetitive tasks or use project-specific tooling, check \`agentctl ctl list\` first.
The commands usually wrap shell scripts or other binaries, providing a clean interface.
`;

  await fs.ensureDir(targetDir);
  const targetFile = path.join(targetDir, 'SKILL.md');
  await fs.writeFile(targetFile, skillContent);
  return targetFile;
}
