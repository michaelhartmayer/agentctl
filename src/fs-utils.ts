import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export function getGlobalRoot() {
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'agentctl');
    }
    return path.join(os.homedir(), '.config', 'agentctl');
}

export function getAntigravityGlobalRoot() {
    return path.join(os.homedir(), '.gemini', 'antigravity');
}

export function findLocalRoot(cwd: string = process.cwd()): string | null {
    let current = path.resolve(cwd);
    const root = path.parse(current).root;
    // Safety break and root check
    while (true) {
        if (fs.existsSync(path.join(current, '.agentctl'))) {
            return current;
        }
        if (current === root) {
            return null;
        }
        current = path.dirname(current);
    }
}
