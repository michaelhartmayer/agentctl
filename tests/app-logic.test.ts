import { describe, it, expect } from 'vitest';
import { AppLogic } from '../src/logic';

describe('AppLogic.planApp', () => {
    it('passes scaffold args without shell string re-splitting', () => {
        const effects = AppLogic.planApp(['git', 'create-ck-gist', '--desc', 'test description'], {
            manifestPath: '/tmp/.agentctl/git/create-ck-gist/manifest.json',
            manifest: {
                name: 'create-ck-gist',
                type: 'scaffold',
                run: './command.sh'
            },
            args: ['--desc', 'test description'],
            scope: 'local',
            cmdPath: 'git create-ck-gist'
        });

        const spawnEffect = effects.find(effect => effect.type === 'spawn');
        expect(spawnEffect).toMatchObject({
            type: 'spawn',
            command: '/tmp/.agentctl/git/create-ck-gist/command.sh',
            args: ['--desc', 'test description'],
            options: { shell: false }
        });
    });

    it('keeps alias execution shell-based', () => {
        const effects = AppLogic.planApp(['tools', 'logs', '--tail', '200'], {
            manifestPath: '/tmp/.agentctl/tools/logs/manifest.json',
            manifest: {
                name: 'logs',
                type: 'alias',
                run: 'docker compose logs -f'
            },
            args: ['--tail', '200'],
            scope: 'local',
            cmdPath: 'tools logs'
        });

        const spawnEffect = effects.find(effect => effect.type === 'spawn');
        expect(spawnEffect).toMatchObject({
            type: 'spawn',
            command: 'docker compose logs -f --tail 200',
            options: { shell: true }
        });
    });
});
