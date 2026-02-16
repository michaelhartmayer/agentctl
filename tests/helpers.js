"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestDir = createTestDir;
exports.cleanupTestDir = cleanupTestDir;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
const BASE_TEST_DIR = path_1.default.join(os_1.default.tmpdir(), 'agentctl-tests');
async function createTestDir() {
    const dir = path_1.default.join(BASE_TEST_DIR, crypto_1.default.randomUUID());
    await fs_extra_1.default.ensureDir(dir);
    return dir;
}
async function cleanupTestDir(dir) {
    await fs_extra_1.default.remove(dir);
}
