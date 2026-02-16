import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const BASE_TEST_DIR = path.join(os.tmpdir(), 'agentctl-tests');

export async function createTestDir() {
    const dir = path.join(BASE_TEST_DIR, crypto.randomUUID());
    await fs.ensureDir(dir);
    return dir;
}

export async function cleanupTestDir(dir: string) {
    await fs.remove(dir);
}
