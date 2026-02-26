import { describe, it, expect } from 'vitest';
import { Logic, CommandContext } from '../src/logic/ctl';

describe('Logic Brain Coverage', () => {
    const ctx: CommandContext = {
        cwd: '/app',
        platform: 'posix',
        localRoot: '/app',
        globalRoot: '/global',
        homedir: '/home/user'
    };

    it('covers planScaffold default type branch', () => {
        // Line 46: type = options.type || 'scaffold'
        const result = Logic.planScaffold(['test'], ctx, {
            exists: false,
            type: undefined
        });
        expect(result.effects.some(e => e.type === 'log' && e.message.includes('Scaffolded'))).toBe(true);
    });

    it('covers planPushGlobal error branches', () => {
        const noLocalCtx: CommandContext = { ...ctx, localRoot: null };
        expect(() => Logic.planPushGlobal(['cmd'], noLocalCtx, { existsInGlobal: false, existsInLocal: true }))
            .toThrow('Not in a local context');
    });

    it('covers planPullLocal error branches', () => {
        const noLocalCtx: CommandContext = { ...ctx, localRoot: null };
        expect(() => Logic.planPullLocal(['cmd'], noLocalCtx, { existsInGlobal: true, existsInLocal: false }))
            .toThrow('Not in a local context');
    });

    it('covers planInstallSkill agentsmd', () => {
        const effects = Logic.planInstallSkill('agentsmd', ctx, {});
        expect(effects[0].type).toBe('installSkill');
        // @ts-expect-error - targetDir from type
        expect(effects[0].targetDir).toContain('.agents');
    });

    it('covers planInstallSkill cursor', () => {
        const effects = Logic.planInstallSkill('cursor', ctx, {});
        expect(effects[0].type).toBe('installSkill');
        // @ts-expect-error - targetDir from type
        expect(effects[0].targetDir).toContain('.cursor');
    });
});
