import { describe, it, expect, vi } from 'vitest';
import { execute } from '../src/effects';
import { spawn, execFile } from 'child_process';
import EventEmitter from 'events';

vi.mock('child_process', () => ({
    spawn: vi.fn(),
    execFile: vi.fn((cmd, args, opts, callback) => {
        // Simple mock implementation for execFile
        if (typeof callback === 'function') {
            callback(null, 'stdout', 'stderr');
        } else if (typeof opts === 'function') {
            opts(null, 'stdout', 'stderr');
        } else if (typeof args === 'function') {
            args(null, 'stdout', 'stderr');
        }
    })
}));

describe('Effects Executor', () => {
    it('covers spawn effect branch with onExit', async () => {
        const mockChild = new EventEmitter();
        (spawn as any).mockReturnValue(mockChild);

        let exitCode = -1;
        const effects: any[] = [{
            type: 'spawn',
            command: 'echo',
            options: {},
            onExit: (code: number) => { exitCode = code; }
        }];

        await execute(effects);

        expect(spawn).toHaveBeenCalledWith('echo', {});

        mockChild.emit('exit', 0);
        expect(exitCode).toBe(0);
    });

    it('covers spawn effect branch without onExit', async () => {
        (spawn as any).mockReturnValue(new EventEmitter());
        const effects: any[] = [{
            type: 'spawn',
            command: 'echo',
            options: {}
        }];
        await execute(effects);
        expect(spawn).toHaveBeenCalledWith('echo', {});
    });

    it('covers gitClone effect branch', async () => {
        const effects: any[] = [{
            type: 'gitClone',
            url: 'https://github.com/foo/repo',
            dest: '/tmp/dest'
        }];
        await execute(effects);
        expect(execFile).toHaveBeenCalled();
    });
});
