import os from 'os';
import fs from 'fs-extra';
import { UtilsLogic, SystemContext } from './logic/utils';

export * from './logic/utils';

function getRealContext(): SystemContext {
    return {
        platform: process.platform,
        env: process.env,
        homedir: process.env.HOME || process.env.USERPROFILE || os.homedir()
    };
}

export function getGlobalRoot() {
    return UtilsLogic.getGlobalRoot(getRealContext());
}

export function getAntigravityGlobalRoot() {
    return UtilsLogic.getAntigravityGlobalRoot(getRealContext());
}

export function findLocalRoot(cwd: string = process.cwd()): string | null {
    return UtilsLogic.findLocalRoot(cwd, fs.existsSync);
}
