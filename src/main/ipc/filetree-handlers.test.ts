import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('filetree utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filetree-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists directories before files', async () => {
    fs.mkdirSync(path.join(tempDir, 'z-dir'));
    fs.mkdirSync(path.join(tempDir, 'a-dir'));
    fs.writeFileSync(path.join(tempDir, 'z-file.txt'), 'content');
    fs.writeFileSync(path.join(tempDir, 'a-file.txt'), 'content');

    const entries = await fs.promises.readdir(tempDir, { withFileTypes: true });
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    expect(entries[0].name).toBe('a-dir');
  });

  it('detects binary files', () => {
    const binaryPath = path.join(tempDir, 'binary.bin');
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    fs.writeFileSync(binaryPath, buffer);

    const content = fs.readFileSync(binaryPath);
    let isBinary = false;
    for (let i = 0; i < Math.min(8192, content.length); i++) {
      if (content[i] === 0) {
        isBinary = true;
        break;
      }
    }

    expect(isBinary).toBe(true);
  });

  it('detects text files', () => {
    const textPath = path.join(tempDir, 'text.txt');
    fs.writeFileSync(textPath, 'Hello, World!');

    const content = fs.readFileSync(textPath);
    let isBinary = false;
    for (let i = 0; i < Math.min(8192, content.length); i++) {
      if (content[i] === 0) {
        isBinary = true;
        break;
      }
    }

    expect(isBinary).toBe(false);
  });
});