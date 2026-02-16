---
name: agentctl
description: Agent Controller - A unified interface for project-specific commands and automation.
---

# Agent Controller (agentctl)

Agent Controller is a CLI tool used to manage and execute project-specific commands. It supports local project-scoped commands and global user-scoped commands.

## Capabilities

- **Command Discovery**: Use `agentctl ctl list` to see all available commands.
- **Command Scaffolding**: Create new commands using `agentctl ctl scaffold <path>`.
- **Global/Local Management**: Push commands to global scope with `agentctl ctl global <path>` or pull to local with `agentctl ctl local <path>`.
- **Command Execution**: Run any command via `agentctl <path> [args...]`.

## Usage for Antigravity

When you need to perform repetitive tasks or use project-specific tooling, check `agentctl ctl list` first. 
The commands usually wrap shell scripts or other binaries, providing a clean interface.

### Example
To create a new deployment script:
1. `agentctl ctl scaffold deploy`
2. Edit the generated `command.sh` or `command.cmd` in `.agentctl/deploy/`.
3. Run it with `agentctl deploy`.
