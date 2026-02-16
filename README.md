# agentctl 🤖🛠️

**One CLI to rule them all.**

> **agentctl** is a unified control plane for humans and AI agents. It lets you build, organize, and manage command-line tools without frameworks or complex protocols. Just structured shell commands that anyone (or anything) can run.

## Why?

- **Zero Friction**: Turn any script or one-liner into a structured CLI command in seconds.
- **Universal Interface**: Humans get a nice help menu; Agents get a discoverable toolset.
- **Scoped Execution**: Keep project-specific commands in your repo (`.agentctl/`), and user-wide tools in your global config (`~/.config/agentctl/`).
- **AI Native**: Built-in support for installing "skills" into AI coding assistants (Cursor, Antigravity, Gemini).

---

## Installation

```bash
npm install -g agentctl
# or run directly
npx agentctl <command>
```

## Quick Start

### 1. Create a command
Scaffold a new command. This creates a script file you can edit.

```bash
agentctl ctl scaffold "dev start"
# Created .agentctl/dev/start/command.sh (or .cmd on Windows)
```

### 2. Run it
```bash
agentctl dev start
# Executes your script!
```

### 3. Alias an existing tool
Group your favorite tools under a unified namespace.

```bash
agentctl ctl group tools
agentctl ctl alias "tools gh" gh
agentctl ctl alias "tools slack" slack-cli

agentctl tools
# Lists available tools: gh, slack
```

---

## Core Concepts

### 📂 Groups & Commands
- **Group**: A namespace (folder) that contains other commands.
- **Command**: A leaf node that executes a script or binary.

The filesystem **IS** the command tree.
`.agentctl/dev/build/` → `agentctl dev build`

### 🌍 Scoping

**Local Scope**: `.agentctl/` in your current directory.
- Ideal for project-specific workflows (build, test, deploy).
- Check it into git to share with your team!

**Global Scope**: `~/.config/agentctl/` (or `%APPDATA%\agentctl` on Windows).
- Ideal for your personal toolbelt.
- Access these commands from anywhere.

**Move between scopes:**
```bash
# Move a local command to global scope
agentctl ctl global "my-script" --move
```

---

## Agent Integration 🧠

`agentctl` is designed to be the bridge between you and your AI agents.

### Install Skills
Teach your AI agent how to use `agentctl` by installing a skill file.

```bash
# For Cursor / Windsurf / Antigravity
agentctl ctl --install-skill cursor
```

### Headless Execution
Run agentic workflows directly from the CLI.

```bash
# Run a headless Gemini session in the current directory
agentctl agent headless-gemini . "refactor the formatting in src/"
```
*(Requires `gemini-cli` installed and authenticated)*

---

## Management Commands (`ctl`)

The `ctl` subcommand is the meta-layer for managing `agentctl` itself.

| Command | Description |
|---|---|
| `scaffold <path>` | Create a new script-based command |
| `alias <path> <target>` | Create a command that runs another command |
| `group <path>` | Create a new namespace |
| `rm <path>` | Remove a command or group |
| `mv <src> <dest>` | and/or rename a command |
| `list` | Show all commands (local + global) |
| `inspect <path>` | JSON dump of command manifest |
| `global <path>` | Promote local command to global |
| `local <path>` | Pull global command to local |

---

## License

MIT
