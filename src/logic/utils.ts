import path from 'path';

export interface SystemContext {
    platform: string;
    env: NodeJS.ProcessEnv;
    homedir: string;
}

export const UtilsLogic = {
    getGlobalRoot(ctx: SystemContext) {
        if (ctx.platform === 'win32') {
            return path.join(ctx.env.APPDATA || path.join(ctx.homedir, 'AppData', 'Roaming'), 'agentctl');
        }
        return path.join(ctx.homedir, '.config', 'agentctl');
    },

    getAntigravityGlobalRoot(ctx: SystemContext) {
        return path.join(ctx.homedir, '.gemini', 'antigravity');
    },

    findLocalRoot(cwd: string, existsSync: (p: string) => boolean): string | null {
        let current = path.resolve(cwd);
        const root = path.parse(current).root;
        for (; ;) {
            if (existsSync(path.join(current, '.agentctl'))) {
                return current;
            }
            if (current === root) {
                return null;
            }
            current = path.dirname(current);
        }
    }
};
