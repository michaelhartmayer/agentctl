import { describe, it, expect } from 'vitest';
import { isCappedManifest, Manifest } from '../src/manifest';

describe('isCappedManifest', () => {
    it('returns true when manifest has a run command', () => {
        const m: Manifest = { name: 'test', run: './script.sh' };
        expect(isCappedManifest(m)).toBe(true);
    });

    it('returns true when manifest type is scaffold', () => {
        const m: Manifest = { name: 'test', type: 'scaffold' };
        expect(isCappedManifest(m)).toBe(true);
    });

    it('returns true when manifest type is alias', () => {
        const m: Manifest = { name: 'test', type: 'alias' };
        expect(isCappedManifest(m)).toBe(true);
    });

    it('returns false when manifest is a plain group', () => {
        const m: Manifest = { name: 'test', type: 'group' };
        expect(isCappedManifest(m)).toBe(false);
    });

    it('returns false when manifest has no type and no run', () => {
        const m: Manifest = { name: 'test' };
        expect(isCappedManifest(m)).toBe(false);
    });
});
