import { Manifest } from './manifest';

export interface PathFacts {
    exists: boolean;
    manifest: Manifest | null;
    isDir: boolean;
    path: string;
}

export interface ResolveDecision {
    currentMatch: {
        scope: 'local' | 'global';
        manifest: Manifest;
        manifestPath: string;
    } | null;
    finalResult: {
        scope: 'local' | 'global';
        manifest: Manifest;
        manifestPath: string;
    } | null;
    shouldStop: boolean;
}

export const ResolveLogic = {
    decide(
        local: PathFacts | null,
        global: PathFacts,
        isCapped: (m: Manifest) => boolean
    ): ResolveDecision {
        if (!local?.manifest && !global.manifest) {
            return { currentMatch: null, finalResult: null, shouldStop: true };
        }

        const localManifest = local?.manifest;
        const globalManifest = global.manifest;

        // 1. Local Capped -> Return Match immediately.
        if (localManifest && isCapped(localManifest)) {
            return {
                currentMatch: null,
                finalResult: {
                    scope: 'local',
                    manifest: localManifest,
                    manifestPath: local!.path
                },
                shouldStop: true
            };
        }

        // 2. Global Capped
        if (globalManifest && isCapped(globalManifest)) {
            if (localManifest) {
                // Local Group shadows Global Capped
                return {
                    currentMatch: {
                        scope: 'local',
                        manifest: localManifest,
                        manifestPath: local!.path
                    },
                    finalResult: null,
                    shouldStop: false
                };
            } else {
                return {
                    currentMatch: null,
                    finalResult: {
                        scope: 'global',
                        manifest: globalManifest,
                        manifestPath: global.path
                    },
                    shouldStop: true
                };
            }
        }

        // 3. Neither capped
        if (localManifest) {
            return {
                currentMatch: {
                    scope: 'local',
                    manifest: localManifest,
                    manifestPath: local!.path
                },
                finalResult: null,
                shouldStop: false
            };
        } else {
            return {
                currentMatch: {
                    scope: 'global',
                    manifest: globalManifest!,
                    manifestPath: global.path
                },
                finalResult: null,
                shouldStop: false
            };
        }
    }
};
