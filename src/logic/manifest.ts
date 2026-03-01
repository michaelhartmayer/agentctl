export interface Manifest {
    name: string;
    description?: string;
    help?: string;
    type?: 'scaffold' | 'alias' | 'group';
    run?: string;
    flags?: Record<string, unknown>;
}

export const ManifestLogic = {
    isCappedManifest(m: Manifest): boolean {
        return !!m.run || m.type === 'scaffold' || m.type === 'alias';
    }
};
