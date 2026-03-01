import path from 'path';
import { Effect } from '../effects';
import { ResolvedCommand } from '../resolve';
import { Manifest } from './manifest';

export const AppLogic = {
    planApp(args: string[], result: ResolvedCommand | null): Effect[] {
        if (!result) {
            return [{ type: 'log', message: `Command '${args.join(' ')}' not found. Run 'agentctl list' to see available commands.` }];
        }

        const { manifest, args: remainingArgs, scope, manifestPath, cmdPath } = result;

        const effects: Effect[] = [];

        const allowedKeys = new Set(['name', 'description', 'help', 'type', 'run', 'flags']);
        const unsupportedKeys = Object.keys(manifest).filter(k => !allowedKeys.has(k));
        if (unsupportedKeys.length > 0) {
            effects.push({
                type: 'log',
                message: `[WARNING] The manifest at ${manifestPath} contains unsupported keys: ${unsupportedKeys.join(', ')}. Agentctl will ignore them.`
            });
        }

        if (manifest.run) {
            const cmdDir = path.dirname(manifestPath);
            let runCmd = manifest.run;

            if (runCmd.startsWith('./') || runCmd.startsWith('.\\')) {
                runCmd = path.resolve(cmdDir, runCmd);
            }

            runCmd = runCmd.replace(/{{DIR}}/g, cmdDir);

            const fullCommand = `${runCmd} ${remainingArgs.join(' ')}`;

            effects.push(
                { type: 'log', message: `[${scope}] Running: ${fullCommand}` },
                {
                    type: 'spawn',
                    command: fullCommand,
                    options: {
                        cwd: process.cwd(),
                        shell: true,
                        stdio: 'inherit',
                        env: { ...process.env, AGENTCTL_SCOPE: scope }
                    },
                    onExit: (code: number) => {
                        process.exit(code || 0);
                    }
                }
            );
            return effects;
        } else {
            return [...effects, ...AppLogic.planGroupList(manifest, cmdPath, [], manifestPath)];
        }
    },

    planGroupList(manifest: Manifest, cmdPath: string, allCommands: { path: string, description: string }[], manifestPath?: string): Effect[] {
        const effects: Effect[] = [];

        if (manifestPath) {
            const allowedKeys = new Set(['name', 'description', 'help', 'type', 'run', 'flags']);
            const unsupportedKeys = Object.keys(manifest).filter(k => !allowedKeys.has(k));
            if (unsupportedKeys.length > 0) {
                effects.push({
                    type: 'log',
                    message: `[WARNING] The manifest at ${manifestPath} contains unsupported keys: ${unsupportedKeys.join(', ')}. Agentctl will ignore them.`
                });
            }
        }

        effects.push(
            { type: 'log', message: manifest.name },
            { type: 'log', message: manifest.help || manifest.description || 'Command group containing subcommands' },
            { type: 'log', message: '\nSubcommands:' }
        );

        const prefix = cmdPath + ' ';
        const depth = cmdPath.split(' ').length;

        const children = allCommands.filter(c => c.path.startsWith(prefix) && c.path !== cmdPath);
        const direct = children.filter(c => c.path.split(' ').length === depth + 1);

        if (direct.length === 0) {
            effects.push({ type: 'log', message: '  (No subcommands found)' });
        } else {
            for (const child of direct) {
                const name = child.path.split(' ').pop();
                const desc = child.description || 'Command group containing subcommands';
                effects.push({ type: 'log', message: `  ${name}\t${desc}` });
            }
        }

        return effects;
    }
};
