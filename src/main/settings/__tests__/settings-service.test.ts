import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsService } from '../settings-service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SettingsService', () => {
  let testDir: string;
  let service: SettingsService;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pidash-settings-test-'));
    process.env.PI_DASH_USER_DATA = testDir;
    service = new SettingsService();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.PI_DASH_USER_DATA;
  });

  it('returns defaults when no settings file exists', () => {
    const all = service.getAll();
    expect(all.general.theme).toBe('dark');
    expect(all.terminal.fontSize).toBe(14);
  });

  it('gets a nested value by path', () => {
    expect(service.get('general.theme')).toBe('dark');
    expect(service.get('terminal.fontSize')).toBe(14);
  });

  it('sets a nested value by path', () => {
    service.set('general.theme', 'light');
    expect(service.get('general.theme')).toBe('light');
  });

  it('persists changes across instances', () => {
    service.set('general.language', 'fr');
    const service2 = new SettingsService();
    expect(service2.get('general.language')).toBe('fr');
  });

  it('resets to defaults', () => {
    service.set('general.theme', 'light');
    service.reset();
    expect(service.get('general.theme')).toBe('dark');
  });

  it('exports settings as JSON', () => {
    service.set('general.theme', 'light');
    const exported = service.export();
    expect(exported.general.theme).toBe('light');
  });

  it('imports settings from JSON', () => {
    const data = service.export();
    data.general.theme = 'system';
    service.import(data);
    expect(service.get('general.theme')).toBe('system');
  });
});
