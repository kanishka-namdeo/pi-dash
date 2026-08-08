import { describe, it, expect } from 'vitest';
import { isGitRepo } from '../git-operations';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Git Operations', () => {
  it('returns true for git repository', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    const gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir);

    const result = await isGitRepo(tempDir);
    expect(result).toBe(true);

    fs.rmSync(tempDir, { recursive: true });
  });

  it('returns false for non-git directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));

    const result = await isGitRepo(tempDir);
    expect(result).toBe(false);

    fs.rmSync(tempDir, { recursive: true });
  });
});
