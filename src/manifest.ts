import fs from 'fs-extra';

export interface Manifest {
    name: string;
    description?: string;
    type?: 'scaffold' | 'alias' | 'group';
    run?: string;
    flags?: Record<string, unknown>;
}

export async function readManifest(p: string): Promise<Manifest | null> {
    try {
        return await fs.readJson(p);
    } catch {
        return null;
    }
}

export function isCappedManifest(m: Manifest): boolean {
    return !!m.run || m.type === 'scaffold' || m.type === 'alias';
}
