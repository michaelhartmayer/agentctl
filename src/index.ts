#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import 'fs-extra';
import { list, inspect, scaffold, alias, group, rm, mv, pushGlobal, pullLocal, installSkill } from './ctl';
import { resolveCommand } from './resolve';
import { spawn } from 'child_process';
import chalk from 'chalk';

const program = new Command();
import pkg from '../package.json';

program
    .name('agentctl')
    .description('Agent Controller CLI - Unified control plane for humans and agents')
    .version(pkg.version)
    .allowUnknownOption()
    .helpOption(false) // Disable default help to allow pass-through
    .argument('[command...]', 'Command to run')
    .action(async (args, _options, _command) => {
        // If no args, check for help flag or just show help
        if (!args || args.length === 0) {
            // If they passed --help or -h, show help. If no args at all, show help.
            // Since we ate options, we check raw args or just treat empty args as help.
            // command.opts() won't have help if we disabled it? 
            // Actually, if we disable helpOption, --help becomes an unknown option or arg.
            // Let's check process.argv for -h or --help if args is empty?
            // "agentctl --help" -> args=[], options might contain help if we didn't disable it?
            // With helpOption(false), --help is just a flag in argv.

            // If args is empty and we see help flag, show help.
            if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.length <= 2) {
                program.help();
                return;
            }
        }

        // If args are present, we try to resolve.
        // BUT, "agentctl --help" will result in args being empty if it's parsed as option?
        // Wait, if helpOption(false), then --help is an unknown option.
        // If allowUnknownOption is true, it might not be in 'args' if it looks like a flag.
        // Let's rely on resolveCommand. passed args are variadic.

        // However, "agentctl dev --help" -> args=["dev", "--help"]? 
        // My repro says yes: [ 'dev-tools', 'gh', '--help' ].

        // So for "agentctl --help", args might be ["--help"].
        if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
            program.help();
            return;
        }

        // Bypass for ctl subcommand if it slipped through (shouldn't if registered)
        if (args[0] === 'ctl') return;

        try {
            // resolveCommand needs to handle flags in args if they are part of the path?
            // No, flags usually come after. resolveCommand stops at first non-matching path part?
            // resolveCommand logic: iterates args.
            // "dev-tools gh --help" -> path "dev-tools gh", remaining "--help"

            const result = await resolveCommand(args);
            if (!result) {
                // If not found, and they asked for help, show root help?
                // Or if they just typed a wrong command.
                if (args.includes('--help') || args.includes('-h')) {
                    // Try to show help for the partial command? 
                    // For now, just show root list/help or error.
                    // If it's "agentctl dev --help" and "dev" is a group, resolveCommand SHOULD return the group.
                }

                console.error(chalk.red(`Command '${args.join(' ')}' not found.`));
                console.log(`Run ${chalk.cyan('agentctl list')} to see available commands.`);
                process.exit(1);
            }

            const { manifest, args: remainingArgs, scope } = result;

            if (manifest.run) {
                // ... run logic ...
                // remainingArgs should contain --help if it was passed.
                const cmdDir = path.dirname(result.manifestPath);
                let runCmd = manifest.run;

                // Resolve relative path
                if (runCmd.startsWith('./') || runCmd.startsWith('.\\')) {
                    runCmd = path.resolve(cmdDir, runCmd);
                }

                // Interpolate {{DIR}}
                runCmd = runCmd.replace(/{{DIR}}/g, cmdDir);

                const fullCommand = `${runCmd} ${remainingArgs.join(' ')}`;
                console.log(chalk.dim(`[${scope}] Running: ${fullCommand}`));

                const child = spawn(fullCommand, {
                    cwd: process.cwd(), // Execute in CWD as discussed
                    shell: true,
                    stdio: 'inherit',
                    env: { ...process.env, AGENTCTL_SCOPE: scope }
                });

                child.on('exit', (code) => {
                    process.exit(code || 0);
                });
            } else {
                // Group
                console.log(chalk.blue(chalk.bold(`${manifest.name}`)));
                console.log(manifest.description || 'No description');
                console.log('\nSubcommands:');

                const all = await list();
                const prefix = result.cmdPath + ' ';
                // Filter logic roughly for direct children
                const depth = result.cmdPath.split(' ').length;

                const children = all.filter(c => c.path.startsWith(prefix) && c.path !== result.cmdPath);
                const direct = children.filter(c => c.path.split(' ').length === depth + 1);

                if (direct.length === 0 && children.length === 0) {
                    console.log(chalk.dim('  (No subcommands found)'));
                }

                for (const child of direct) {
                    console.log(`  ${child.path.split(' ').pop()}\t${chalk.dim(child.description)}`);
                }
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error(chalk.red(e.message));
            } else {
                console.error(chalk.red('An unknown error occurred'));
            }
            process.exit(1);
        }
    });

const ctl = program.command('ctl')
    .description('Agent Controller Management - Create, organizing, and managing commands');

// --- Lifecycle Commands ---
// We'll stick to flat list but with good descriptions.

// Helper for consistent error handling
// Helper for consistent error handling
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
    .description('Create a new capped command with a script file')
    .argument('<path...>', 'Command path segments (e.g., "dev start")')
    .addHelpText('after', `
Examples:
  $ agentctl ctl scaffold dev start
  $ agentctl ctl scaffold sys backup
`)
    .action(withErrorHandling(async (pathParts) => {
        await scaffold(pathParts);
    }));

ctl.command('alias')
    .description('Create a new capped command that runs an inline shell command')
    .argument('<args...>', 'Name parts followed by target (e.g., "tools" "gh" "gh")')
    .action(withErrorHandling(async (args) => {
        if (args.length < 2) {
            console.error('Usage: ctl alias <name...> <target>');
            process.exit(1);
        }
        const target = args.pop()!;
        const name = args;
        await alias(name, target);
    }))
    .addHelpText('after', `
Examples:
  $ agentctl ctl alias tools gh "gh"
  $ agentctl ctl alias dev build "npm run build"
`);

ctl.command('group')
    .description('Create a new command group (namespace)')
    .argument('<path...>', 'Group path (e.g., "dev")')
    .addHelpText('after', `
Examples:
  $ agentctl ctl group dev
  $ agentctl ctl group tools
`)
    .action(withErrorHandling(async (parts) => {
        await group(parts);
    }));

ctl.command('rm')
    .description('Remove a command or group permanently')
    .argument('<path...>', 'Command path to remove')
    .option('--global', 'Remove from global scope')
    .addHelpText('after', `
Examples:
  $ agentctl ctl rm dev start
  $ agentctl ctl rm tools --global
`)
    .action(withErrorHandling(async (parts, opts) => {
        await rm(parts, { global: opts.global });
    }));

ctl.command('mv')
    .description('Move a command or group to a new path')
    .argument('<src>', 'Source path (quoted string or single token)')
    .argument('<dest>', 'Destination path')
    .option('--global', 'Move command in global scope')
    .addHelpText('after', `
Examples:
  $ agentctl ctl mv "dev start" "dev boot"
  $ agentctl ctl mv tools/gh tools/github --global
`)
    .action(withErrorHandling(async (src, dest, opts) => {
        await mv(src.split(' '), dest.split(' '), { global: opts.global });
    }));

// --- Introspection ---

ctl.command('list')
    .description('List all available commands across local and global scopes')
    .action(withErrorHandling(async () => {
        const items = await list();
        console.log('TYPE      SCOPE     COMMAND             DESCRIPTION');
        for (const item of items) {
            console.log(`${item.type.padEnd(9)} ${item.scope.padEnd(9)} ${item.path.padEnd(19)} ${item.description}`);
        }
    }));

ctl.command('inspect')
    .description('Inspect the internal manifest and details of a command')
    .argument('<path...>', 'Command path to inspect')
    .action(withErrorHandling(async (parts) => {
        const info = await inspect(parts);
        if (info) {
            console.log(JSON.stringify(info, null, 2));
        } else {
            console.error('Command not found');
            process.exit(1);
        }
    }));

// --- Scoping ---

ctl.command('global')
    .description('Push a local command to the global scope')
    .argument('<path...>', 'Local command path')
    .option('--move', 'Move instead of copy')
    .option('--copy', 'Copy (default)')
    .addHelpText('after', `
Examples:
  $ agentctl ctl global sys --move
  $ agentctl ctl global tools --copy
`)
    .action(withErrorHandling(async (parts, opts) => {
        await pushGlobal(parts, { move: opts.move, copy: opts.copy || !opts.move });
    }));

ctl.command('local')
    .description('Pull a global command to the local scope')
    .argument('<path...>', 'Global command path')
    .option('--move', 'Move instead of copy')
    .option('--copy', 'Copy (default)')
    .addHelpText('after', `
Examples:
  $ agentctl ctl local tools --copy
`)
    .action(withErrorHandling(async (parts, opts) => {
        await pullLocal(parts, { move: opts.move, copy: opts.copy || !opts.move });
    }));

// --- Agent Integration ---
// We attach this to the root `ctl` as options or a sub-command? 
// Original code had it as options on `ctl`. We can make it a command for better help.
// But sticking to options maintains compatibility. We'll improve the option help.

ctl.option('--install-skill <agent>', 'Install skill for agent (cursor, antigravity, agentsmd, gemini)')
    .option('--global', 'Install skill globally (for supported agents)')
    .addHelpText('after', `
Examples:
  $ agentctl ctl --install-skill cursor
  $ agentctl ctl --install-skill antigravity --global
  $ agentctl ctl --install-skill gemini
`)
    .action(withErrorHandling(async (op, command) => {
        const opts = ctl.opts();
        if (opts.installSkill) {
            await installSkill(opts.installSkill, { global: opts.global });
        } else {
            // If no subcmd and no option, show help
            if (command.args.length === 0) {
                ctl.help();
            }
        }
    }));

// Inject dynamic commands into root help
// We need to do this before parsing
(async () => {
    try {
        const allCommands = await list();
        const topLevel = allCommands.filter(c => !c.path.includes(' ')); // Only top level

        if (topLevel.length > 0) {
            const lines = [''];
            lines.push('User Commands:');
            for (const cmd of topLevel) {
                // simple padding
                lines.push(`  ${cmd.path.padEnd(27)}${cmd.description}`);
            }
            lines.push('');

            program.addHelpText('after', lines.join('\n'));
        }
    } catch {
        // Ignore errors during help generation (e.g. if not initialized)
    }

    program.parse(process.argv);
})();
