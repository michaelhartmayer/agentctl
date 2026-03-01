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

### Provide the proper help copy
When creating commands, make sure the `manifest.json` properly scopes its information:
- `description`: A short summary of the command, displayed when viewing the list of available commands.
- `help`: A longer set of instructions/usage string. For `group` types, this is displayed when calling the group without a subcommand. For `scaffold` types, this is currently for reference only; your command script must manually handle an `--help` flag for detailed usage.

#### Scaffold Schema
```json
{
  "name": "<command_folder_name>",
  "description": "<insert command summary here>",
  "help": "<insert longer usage/help instructions here>",
  "type": "scaffold",
  "run": "./command.cmd"
}
```

#### Group Schema
```json
{
  "name": "<group_folder_name>",
  "description": "<insert group summary here>",
  "help": "<insert longer group description/instructions here>",
  "type": "group"
}
```

---

## Management Commands (`ctl`)

The `ctl` subcommand is the meta-layer for managing `agentctl` itself.

### `agentctl ctl scaffold <path>`
Create a new script-based command. This generates a folder containing a `manifest.json` and a starter script (`command.cmd`/`command.sh`) for your logic.
- **Why it's great:** Automates the boilerplate of creating a new CLI tool.
- **When to use it:** When you have a complex script or an arbitrary executable (Node, Python, Go) you want to expose easily via the CLI.
```bash
agentctl ctl scaffold build:front
agentctl ctl scaffold "build server" # Creates group 'build' and subcommand 'server'
```

### `agentctl ctl group <path>`
Create a new namespace to organize subcommands. 
- **Why it's great:** Keeps your CLI clean by grouping related tools without forcing you to write a parent CLI router.
- **When to use it:** When you have a collection of similar commands (e.g., `db migrate`, `db reset`) and want an organized help menu grouping them under `db`.
```bash
agentctl ctl group data # Creates 'data' group
agentctl ctl group "cloud aws" # Creates nested 'cloud/aws' groups
```

### `agentctl ctl alias <path> <target>`
Create a command that simply runs an existing binary, string, or target.
- **Why it's great:** Replaces bash aliases with structured, documentable commands that work locally or globally across environments and OSes.
- **When to use it:** When you have a long, frequently used string (`docker compose run --rm node npm install`) and want a short name (`agentctl npm install`) without needing a whole generated shell script.
```bash
agentctl ctl alias "tools gh" gh
agentctl ctl alias list-files "ls -la"
```

### `agentctl ctl rm [options] <path>`
Permanently remove a command or entire group from your workspace.
- **Why it's great:** Quickly clean up old tooling right from the CLI without needing to manually delete `.agentctl` directories.
- **When to use it:** When retiring a script or cleaning up an obsolete group.

**Options:**
- `-g, --global`: Remove from global scope instead of local

```bash
agentctl ctl rm build:front # Removes local 'build front' command
agentctl ctl rm mytool --global # Removes global 'mytool' command
```

### `agentctl ctl mv [options] <src> <dest>`
Rename a command or move it to a new group/namespace.
- **Why it's great:** Refactor your CLI commands like you'd refactor code, moving logic around namespaces without breaking the underlying executed scripts.
- **When to use it:** When restructuring your toolbelt from a flat list to a nested categorization.

**Options:**
- `-g, --global`: Operate in global scope

```bash
agentctl ctl mv mytool my-new-tool
agentctl ctl mv "tools ping" "network ping"
agentctl ctl mv "tools ping" "network ping" --global # Moves in global scope
```

### `agentctl ctl list [options]`
List all currently available commands across both your local and global scopes.
- **Why it's great:** Generates an easy-to-read JSON summary of everything your agent can do.
- **When to use it:** When programming an agent or exploring what tooling is available in a scoped project.

```bash
agentctl ctl list
```

### `agentctl ctl inspect [options] <path>`
Dump the resolved manifest and location of a given command path.
- **Why it's great:** Eliminates the "where did this command come from?" problem when debugging complex workspaces.
- **When to use it:** When you have local/global conflicts or want to quickly see the JSON source manifest for a command.
```bash
agentctl ctl inspect dev:start
```

### `agentctl ctl global [options] <path>`
Promote a local command or group to your globally available toolbelt.
- **Why it's great:** Eject highly useful, generic project abstractions directly into your personal universal toolbelt.
- **When to use it:** You wrote a script specific to a project and realized "I want this CLI tool in every repo I touch."

**Options:**
- `-c, --copy`: Copy the command (keep local version, default)
- `-m, --move`: Move the command (delete local after copying)

```bash
agentctl ctl global "dev toolkit" # Copies the command to global scope
agentctl ctl global "dev toolkit" --move # Moves it instead of copy
```

### `agentctl ctl local [options] <path>`
Bring a global command down into the current local project environment.
- **Why it's great:** Promotes collaboration seamlessly. You can take your personal script, localize it, and commit it to git for your entire team.
- **When to use it:** You have a generic tool that is suddenly very relevant to a specific repository, and you want CI or your coworkers to access it.

**Options:**
- `-c, --copy`: Copy the command (keep global version, default)
- `-m, --move`: Move the command (delete global after pulling)

```bash
agentctl ctl local "my global-tool"
agentctl ctl local "my global-tool" --move
```

### `agentctl ctl install [options] <repo-url> [path...]`
Install commands or groups directly from a remote Git repository's `.agentctl` folder into your local or global scope.
- **Why it's great:** Provides dependency-free tool sharing! Distribute entire suites of scripts/commands without using a package manager.
- **When to use it:** When you want to pull down shared utility commands that your team maintains in a central repository, or distribute your own tools to others.

**Options:**
- `-g, --global`: Install globally instead of locally
- `--allow-collisions`: Allow overwriting existing commands or merging into groups

```bash
agentctl ctl install https://github.com/my-org/tools
agentctl ctl install https://github.com/my-org/tools --global
agentctl ctl install https://github.com/my-org/tools deploy --allow-collisions
```

---

## License

MIT
