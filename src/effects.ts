import fs from 'fs-extra';
import { copySkill } from './skills';

/**
 * EFFECTS: Pure data structures describing side effects.
 * This is a generic "Language of Action" for your application.
 */


import { SpawnOptions } from 'child_process';

export type Effect =
    | { type: 'writeFile'; path: string; content: string }
    | { type: 'writeJson'; path: string; content: unknown }
    | { type: 'remove'; path: string }
    | { type: 'mkdir'; path: string }
    | { type: 'chmod'; path: string; mode: number }
    | { type: 'move'; src: string; dest: string }
    | { type: 'copy'; src: string; dest: string; options?: fs.CopyOptions }
    | { type: 'log'; message: string }
    | { type: 'installSkill'; targetDir: string, agent: string }
    | { type: 'spawn'; command: string; args?: string[]; options: SpawnOptions, onExit?: (code: number) => void }
    | { type: 'gitClone'; url: string; dest: string };

import { spawn, execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

/**
 * THE EXECUTOR: The only part of the app that actually "does" things.
 * It's a simple, dumb loop.
 */
export async function execute(effects: Effect[]) {
    for (const effect of effects) {
        switch (effect.type) {
            case 'writeFile':
                await fs.writeFile(effect.path, effect.content);
                break;
            case 'writeJson':
                await fs.writeJson(effect.path, effect.content, { spaces: 2 });
                break;
            case 'mkdir':
                await fs.ensureDir(effect.path);
                break;
            case 'chmod':
                await fs.chmod(effect.path, effect.mode);
                break;
            case 'move':
                await fs.move(effect.src, effect.dest);
                break;
            case 'copy':
                await fs.copy(effect.src, effect.dest, effect.options);
                break;
            case 'remove':
                await fs.remove(effect.path);
                break;
            case 'log':
                console.log(effect.message);
                break;
            case 'installSkill': {
                const p = await copySkill(effect.targetDir, effect.agent);
                console.log(`Installed skill for ${effect.agent} at ${p}`);
                break;
            }
            case 'spawn': {
                const child = effect.args
                    ? spawn(effect.command, effect.args, effect.options)
                    : spawn(effect.command, effect.options);
                if (effect.onExit) {
                    child.on('exit', effect.onExit);
                }
                break;
            }
            case 'gitClone': {
                await execFileAsync('git', ['clone', '--depth', '1', effect.url, effect.dest]);
                break;
            }
        }
    }
}
