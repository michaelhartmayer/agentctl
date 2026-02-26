---
name: agentctl
description: Agent Controller - A unified interface for project-specific commands and automation.
---

# Agent Controller (agentctl)

`agentctl` is your primary interface for discovering and executing project-specific tools and scripts.
Instead of guessing shell commands or searching for scripts, use `agentctl` to find structured, documented commands.

## 🎯 Core Capabilities

1.  **Discovery**: List all available tools in the current context.
    -   `agentctl ctl list`
2.  **Inspection**: Understand how to use a specific tool.
    -   `agentctl ctl inspect <command_path>`
3.  **Execution**: Run the tool.
    -   `agentctl <command_path> [args...]`

## 🚀 Common Workflows

### 1. Exploring a new project
When you start working in a repo, check for `agentctl` commands first.

```bash
$ agentctl ctl list
# Output example:
# local   dev build    (Builds the project)
# local   dev test     (Runs unit tests)
# global  sys info     (System diagnostics)
```

### 2. Running a command
Once you find a command (e.g., `dev test`), run it directly:

```bash
$ agentctl dev test --watch
```

### 3. creating new tools
If you need to create a script for a task, scaffold it so it's reusable:

```bash
$ agentctl ctl scaffold "utils cleanup"
# Edit the generated script...
$ agentctl utils cleanup
```

## 🧠 Best Practices for Agents

- **Always list first**: Before assuming a command exists (like `npm test` or `make build`), run `agentctl ctl list` to see if there's a preferred project-specific wrapper.
- **Inspect for arguments**: If you're unsure what arguments a command takes, use `ctl inspect` or run with `--help`.
- **Global vs Local**: Local commands (`.agentctl/`) are specific to the current project. Global commands are available everywhere.

## 🛠️ Troubleshooting

- **Command not found**: Ensure you are in the correct directory (project root) or that the command exists in `checklist`.
- **Permission denied**: `agentctl` handles permissions for scaffolded scripts, but check `chmod +x` if you manually added scripts.

