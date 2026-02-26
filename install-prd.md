# Feature PRD: `agentctl ctl install`

## Summary

Introduce a new management command, `agentctl ctl install`, which allows users to fetch remote command definitions from a Git repository and install them into their local or global `agentctl` environment. It behaves similarly to creating aliases or scaffolding, but operates on entire directories of remote command manifests.

## Target Audience
- Developers who want to share common `agentctl` commands across multiple projects or within an organization.
- Users looking to quickly bootstrap their local environment with a standard set of commands.

---

## Command Definition

### `ctl install <repo-url> [path] [--global] [--allow-collisions]`

**Arguments:**
- `<repo-url>` (required): The URL of the remote Git repository containing an `.agentctl` folder. The commands must reside in a `.agentctl` folder inside the repository.
- `[path]` (optional): The local namespace or group where the fetched commands should be placed (e.g., `remote-tools` or `deploy`). If omitted, the remote `.agentctl` contents are merged directly into the root.

**Flags:**
- `--global` (optional): If passed, the commands are installed into the global `agentctl` scope rather than the local project scope.
- `--allow-collisions` (optional): If passed, allows the installation to overwrite existing commands or merge into existing groups. Without this flag, the installation aborts if any collisions are detected.

---

## Functional Requirements

1. **Fetching remote definitions:** 
   - The command must clone or fetch the specified `repo-url`.
   - It should extract *only* the contents of the `.agentctl/` directory from that repository.
   - *Implementation detail:* A shallow temporary `git clone` can be used to pull the repository, after which the `.agentctl` directory is extracted and the temporary clone is cleaned up.

2. **Placement & Scoping:**
   - **Local Install (default):** Copies the fetched `.agentctl` contents into the current project's `.agentctl/` directory.
   - **Global Install (`--global`):** Copies the fetched `.agentctl` contents into the global configuration directory (e.g., `~/.config/agentctl/` or `%APPDATA%\agentctl\`).
   - **Grouping (`[path]`):** If a `path` is provided, the fetched commands are placed under that namespace.
     - *Example:* `agentctl ctl install https://github.com/user/repo mygroup` puts the commands in `.agentctl/mygroup/`.

3. **Collision Handling:**
   - The command performs a collision check prior to copying.
   - If any target command or group already exists in the destination path, the installation will **abort** to prevent accidental overwrites.
   - The user must explicitly pass the `--allow-collisions` flag to bypass this check. When passed, it will overwrite existing command manifests and merge into existing groups.

4. **Security & Dependencies:**
   - The install command copies `agentctl` manifests and adjacent script files.
   - It does **not** automatically execute anything upon installation.
   - It does **not** install system dependencies (e.g., `npm install` inside the remote scripts). Managing environment dependencies remains the user's responsibility.

---

## Example Scenarios

### 1. Merging standard tools into the project root
```bash
agentctl ctl install https://github.com/org/standard-repo-tools
```
*Result:* All `.agentctl/` commands from the remote repo are copied directly into the current directory's `.agentctl/`.

### 2. Installing global deployment tools into a specific group
```bash
agentctl ctl install https://github.com/org/deploy-scripts deploy --global
```
*Result:* The remote commands are placed in the global scope under the `deploy` group. The user can now run `agentctl deploy <command>` from anywhere.

### 3. Creating a new local namespace
```bash
agentctl ctl install https://github.com/user/db-helpers database
```
*Result:* The remote commands are placed under `.agentctl/database/` locally. The user can now run `agentctl database <command>`.

---

## Out of Scope
- Automatic syncing or updating of installed commands (once installed, they are detached from the remote).
- Granular selection of specific files within the remote `.agentctl` folder (it’s all or nothing for the `.agentctl` folder).
