#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { list, inspect, scaffold, alias, group, rm, mv, pushGlobal, pullLocal, installSkill, install } from './ctl';
import { resolveCommand } from './resolve';
import { execute } from './effects';
import { AppLogic } from './logic/index';
import fs from 'fs';
import path from 'path';

const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const program = new Command();

program
    .name('agentctl')
    .description('Agent Controller CLI - Unified control plane for humans and agents')
    .version(pkg.version);

// --- Subcommand: ctl ---
const ctl = program.command('ctl')
    .description('Agent Controller Management - Create, organize, and manage commands');

const withErrorHandling = <T extends unknown[]>(fn: (...args: T) => Promise<void>) => {
    return async (...args: T) => {
        try {
            await fn(...args);
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error(chalk.red(e.message));
            } else {
                console.error(chalk.red(String(e)));
            }
            process.exit(1);
        }
    };
};

ctl.command('scaffold')
    .description('Scaffold a new command directory with a manifest and starter script.')
    .argument('[path...]', 'Hierarchical path for the new command (e.g., "dev start" or "utils/cleanup")')
    .summary('create a new command')
    .addHelpText('after', `
Additional Info:
  This command creates a folder in your local .agentctl directory.
  Inside, it generates:
    - manifest.json: Metadata about the command.
    - command.sh/cmd: A starter script for your logic.

Examples:
  $ agentctl ctl scaffold build front
  $ agentctl ctl scaffold utils/backup
`)
    .action(withErrorHandling(async (pathParts: string[], opts: any, command: Command) => {
        if (!pathParts || pathParts.length === 0) {
            command.help();
            return;
        }
        await scaffold(pathParts);
    }));

ctl.command('alias')
    .description('Create a command that executes a raw shell string.')
    .argument('[args...]', 'Hierarchical path segments followed by the shell command target')
    .summary('create a shell alias')
    .addHelpText('after', `
Examples:
  $ agentctl ctl alias dev logs "docker compose logs -f"
  $ agentctl ctl alias list-files "ls -la"
`)
    .action(withErrorHandling(async (args: string[], opts: any, command: Command) => {
        if (!args || args.length < 2) {
            command.help();
            return;
        }
        const target = args.pop()!;
        const name = args;
        await alias(name, target);
    }));

ctl.command('group')
    .description('Create a command group (namespace) to organize subcommands.')
    .argument('[path...]', 'Hierarchical path for the group (e.g., "dev" or "cloud/aws")')
    .summary('create a namespace group')
    .addHelpText('after', `
Additional Info:
  Groups allow you to categorize commands. Running a group command without
  subcommands will list all direct subcommands within that group.

Examples:
  $ agentctl ctl group dev
  $ agentctl ctl group data/pipelines
`)
    .action(withErrorHandling(async (parts: string[], opts: any, command: Command) => {
        if (!parts || parts.length === 0) {
            command.help();
            return;
        }
        await group(parts);
    }));

ctl.command('rm')
    .description('Permanently remove a command or group.')
    .argument('[path...]', 'Command path to remove')
    .option('-g, --global', 'Remove from global scope instead of local')
    .summary('delete a command')
    .addHelpText('after', `
Examples:
  $ agentctl ctl rm dev start
  $ agentctl ctl rm utils --global
`)
    .action(withErrorHandling(async (parts: string[], opts: any, command: Command) => {
        if (!parts || parts.length === 0) {
            command.help();
            return;
        }
        await rm(parts, { global: opts.global });
    }));

ctl.command('mv')
    .description('Move or rename a command/group within its current scope.')
    .argument('[src]', 'Current path (space-separated or quoted)')
    .argument('[dest]', 'New path (space-separated or quoted)')
    .option('-g, --global', 'Operate in global scope')
    .summary('rename/move a command')
    .addHelpText('after', `
Examples:
  $ agentctl ctl mv "dev start" "dev begin"
  $ agentctl ctl mv utils scripts --global
`)
    .action(withErrorHandling(async (src: string | undefined, dest: string | undefined, opts: any, command: Command) => {
        if (!src || !dest) {
            command.help();
            return;
        }
        await mv(src.split(' '), dest.split(' '), { global: opts.global });
    }));

ctl.command('list')
    .description('List all available commands across local and global scopes.')
    .summary('list all commands')
    .addHelpText('after', `
Output Columns:
  TYPE      - scaffold, alias, or group
  SCOPE     - local (project-specific) or global (user-wide)
  COMMAND   - The path used to invoke the command
  DESCRIPTION - Brief text from the command's manifest
`)
    .action(withErrorHandling(async () => {
        const items = await list();
        console.log(chalk.bold('TYPE      SCOPE     COMMAND             DESCRIPTION'));
        for (const item of items) {
            const typePipe = item.type.padEnd(9);
            const scopePipe = item.scope === 'local' ? chalk.cyan(item.scope.padEnd(9)) : chalk.magenta(item.scope.padEnd(9));
            console.log(`${typePipe} ${scopePipe} ${chalk.yellow(item.path.padEnd(19))} ${item.description}`);
        }
    }));

ctl.command('inspect')
    .description('Show the internal manifest and file system path of a command.')
    .argument('[path...]', 'Command path to inspect')
    .summary('inspect command details')
    .addHelpText('after', `
Examples:
  $ agentctl ctl inspect dev start
`)
    .action(withErrorHandling(async (parts: string[], opts: any, command: Command) => {
        if (!parts || parts.length === 0) {
            command.help();
            return;
        }
        const info = await inspect(parts);
        if (info) {
            console.log(JSON.stringify(info, null, 2));
        } else {
            console.error(chalk.red('Command not found'));
            process.exit(1);
        }
    }));

ctl.command('global')
    .description('Promote a local command to the global scope.')
    .argument('[path...]', 'Local command path to promote')
    .option('-m, --move', 'Move the command (delete local after copying)')
    .option('-c, --copy', 'Copy the command (keep local version, default)')
    .summary('make a command global')
    .addHelpText('after', `
Additional Info:
  Global commands are stored in your home directory and are available in any project.

Examples:
  $ agentctl ctl global utils/cleanup
  $ agentctl ctl global dev/deploy --move
`)
    .action(withErrorHandling(async (parts: string[], opts: any, command: Command) => {
        if (!parts || parts.length === 0) {
            command.help();
            return;
        }
        await pushGlobal(parts, { move: opts.move, copy: opts.copy || !opts.move });
    }));

ctl.command('local')
    .description('Pull a global command into the current local project.')
    .argument('[path...]', 'Global command path to pull')
    .option('-m, --move', 'Move the command (delete global after pulling)')
    .option('-c, --copy', 'Copy the command (keep global version, default)')
    .summary('make a command local')
    .addHelpText('after', `
Examples:
  $ agentctl ctl local utils/shared
  $ agentctl ctl local snippets/js --move
`)
    .action(withErrorHandling(async (parts: string[], opts: any, command: Command) => {
        if (!parts || parts.length === 0) {
            command.help();
            return;
        }
        await pullLocal(parts, { move: opts.move, copy: opts.copy || !opts.move });
    }));

ctl.command('install-skill')
    .description('Configure a supported AI agent (like Cursor or Gemini) to natively use Agentctl.')
    .argument('[agent]', 'Agent name (cursor, antigravity, agentsmd, gemini)')
    .option('-g, --global', 'Install globally for the agent (if supported)')
    .summary('configure AI agent integration')
    .addHelpText('after', `
Supported Agents:
  - cursor      (Installs to .cursor/skills)
  - antigravity (Installs to .agent/skills or ~/.gemini/antigravity)
  - agentsmd    (Installs to .agents/skills)
  - gemini      (Installs to .gemini/skills or ~/.gemini/skills)

Examples:
  $ agentctl ctl install-skill cursor
  $ agentctl ctl install-skill antigravity --global
`)
    .action(withErrorHandling(async (agent: string | undefined, opts: any, command: Command) => {
        if (!agent) {
            command.help();
            return;
        }
        await installSkill(agent, { global: opts.global });
    }));

ctl.command('install')
    .description('Install a command group from a remote Git repository.')
    .argument('[repoUrl]', 'URL of the remote Git repository containing an .agentctl folder')
    .argument('[pathParts...]', 'Optional local namespace/group to install into')
    .option('-g, --global', 'Install globally instead of locally')
    .option('--allow-collisions', 'Allow overwriting existing commands or merging into groups')
    .summary('install remote command group')
    .addHelpText('after', `
Additional Info:
  Fetches the .agentctl folder from the remote repository and installs it into
  your local or global agentctl environment.

Examples:
  $ agentctl ctl install https://github.com/org/repo-tools
  $ agentctl ctl install https://github.com/org/deploy-scripts deploy --global
`)
    .action(withErrorHandling(async (repoUrl: string | undefined, pathParts: string[], opts: any, command: Command) => {
        if (!repoUrl) {
            command.help();
            return;
        }
        await install(repoUrl, pathParts, { global: opts.global, allowCollisions: opts.allowCollisions });
    }));


// --- Dynamic Command Logic ---

async function handleDynamicCommand(args: string[]) {
    try {
        const result = await resolveCommand(args);
        if (!result) {
            const effects = AppLogic.planApp(args, null);
            await execute(effects.map(e => e.type === 'log' ? { ...e, message: chalk.red(e.message) } : e));
            process.exit(1);
        }

        if (result.manifest.run) {
            const effects = AppLogic.planApp(args, result);
            await execute(effects);
        } else {
            const all = await list();
            const effects = AppLogic.planGroupList(result.manifest, result.cmdPath, all);
            await execute(effects.map(e => {
                if (e.type === 'log') {
                    if (e.message === result.manifest.name) return { ...e, message: chalk.blue(chalk.bold(e.message)) };
                    if (e.message === '\nSubcommands:') return e;
                    if (e.message.startsWith('  ')) return e;
                    if (e.message === 'No description') return { ...e, message: chalk.dim(e.message) };
                }
                return e;
            }));
        }
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error(chalk.red(e.message));
        } else {
            console.error(chalk.red('An unknown error occurred'));
        }
        process.exit(1);
    }
}

(async () => {
    // Add help text for user commands dynamically
    try {
        const allCommands = await list();
        const topLevel = allCommands.filter(c => !c.path.includes(' '));

        if (topLevel.length > 0) {
            const lines = [''];
            lines.push(chalk.bold('User Commands:'));
            for (const cmd of topLevel) {
                lines.push(`  ${chalk.yellow(cmd.path.padEnd(27))}${cmd.description}`);
            }
            lines.push('');
            program.addHelpText('after', lines.join('\n'));
        }
    } catch {
        // Ignore errors during help generation
    }

    // Process arguments
    const args = process.argv.slice(2);

    // If no args, show help
    if (args.length === 0) {
        program.help();
        return;
    }

    // Special case: if it starts with 'ctl', or is '--help', '--version', '-h', etc.,
    // let commander handle it natively.
    const firstArg = args[0];
    const isStandardCommand = ['ctl', '--help', '-h', '--version', '-V'].includes(firstArg) || firstArg.startsWith('-');

    if (isStandardCommand) {
        program.parse(process.argv);
    } else {
        // It's a dynamic command
        await handleDynamicCommand(args);
    }
})();
