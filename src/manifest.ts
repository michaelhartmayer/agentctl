import fs from 'fs-extra';
import { Manifest, ManifestLogic } from './logic/manifest';

export * from './logic/manifest';

export async function readManifest(p: string): Promise<Manifest | null> {
    try {
        return await fs.readJson(p);
    } catch {
        return null;
    }
}

export function isCappedManifest(m: Manifest): boolean {
    return ManifestLogic.isCappedManifest(m);
}
