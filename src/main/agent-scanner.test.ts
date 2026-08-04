import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanSystem, validateAgent, identifyAgent, fingerprintAgent } from './agent-scanner';
import fs from 'fs/promises';
import { exec } from 'child_process';

vi.mock('fs/promises');
vi.mock('child_process');

describe('agent-scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fingerprintAgent', () => {
    it('generates consistent fingerprint from path', () => {
      const fp1 = fingerprintAgent('/usr/bin/omp');
      const fp2 = fingerprintAgent('/usr/bin/omp');
      expect(fp1).toBe(fp2);
    });

    it('generates different fingerprints for different paths', () => {
      const fp1 = fingerprintAgent('/usr/bin/omp');
      const fp2 = fingerprintAgent('/usr/local/bin/omp');
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('validateAgent', () => {
    it('rejects non-existent paths', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const result = await validateAgent('/nonexistent');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('rejects directories', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      const result = await validateAgent('/some/dir');
      expect(result.valid).toBe(false);
      expect(result.isDirectory).toBe(true);
    });

    it('accepts valid executables on Unix', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false, mode: 0o755 } as any);
      const result = await validateAgent('/usr/bin/omp');
      expect(result.valid).toBe(true);
      expect(result.executable).toBe(true);
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('accepts .exe files on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false, mode: 0o644 } as any);
      
      const result = await validateAgent('C:\\Program Files\\Cursor\\cursor.exe');
      expect(result.valid).toBe(true);
      expect(result.executable).toBe(true);
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('identifyAgent', () => {
    it('identifies known agent by binary name', async () => {
      const result = await identifyAgent('/usr/bin/omp');
      expect(result.knownAgentId).toBe('omp');
      expect(result.suggestedName).toBe('Oh My Pi');
      expect(result.confidence).toBe('high');
    });

    it('identifies cursor agent', async () => {
      const result = await identifyAgent('/usr/bin/cursor');
      expect(result.knownAgentId).toBe('cursor');
      expect(result.suggestedName).toBe('Cursor');
      expect(result.confidence).toBe('high');
    });

    it('falls back to filename for unknown agents', async () => {
      const result = await identifyAgent('/usr/bin/unknown-tool');
      expect(result.knownAgentId).toBeUndefined();
      expect(result.suggestedName).toBe('unknown-tool');
      expect(result.confidence).toBe('low');
    });
  });

  describe('scanSystem', () => {
    it('finds agents in PATH', async () => {
      vi.mocked(exec).mockImplementation(((cmd: string, callback: any) => {
        if (cmd.includes('which omp') || cmd.includes('where omp')) {
          callback(null, { stdout: '/usr/bin/omp\n' });
        } else {
          callback(new Error('not found'), { stdout: '' });
        }
      }) as any);

      const result = await scanSystem();
      expect(result.agents.length).toBeGreaterThan(0);
      expect(result.agents[0].name).toBe('Oh My Pi');
    });

    it('handles unreadable directories gracefully', async () => {
      vi.mocked(exec).mockImplementation(((cmd: string, callback: any) => {
        callback(new Error('not found'), { stdout: '' });
      }) as any);
      
      vi.mocked(fs.access).mockRejectedValue(new Error('EACCES'));

      const result = await scanSystem();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns scan metadata', async () => {
      vi.mocked(exec).mockImplementation(((cmd: string, callback: any) => {
        callback(new Error('not found'), { stdout: '' });
      }) as any);
      
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await scanSystem();
      expect(result.locationsScanned).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
