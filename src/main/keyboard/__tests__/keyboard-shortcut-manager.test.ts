import { describe, it, expect, vi } from 'vitest';
import { KeyboardShortcutManager } from '../keyboard-shortcut-manager';
import type { SettingsService } from '../../settings/settings-service';

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn(),
    unregisterAll: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  app: {
    quit: vi.fn(),
  },
}));

describe('KeyboardShortcutManager', () => {
  it('can be instantiated', () => {
    const mockSettings = { get: vi.fn().mockReturnValue({ general: {}, agents: {}, navigation: {} }) };
    const manager = new KeyboardShortcutManager(mockSettings as unknown as SettingsService);
    expect(manager).toBeDefined();
    expect(typeof manager.register).toBe('function');
    expect(typeof manager.unregister).toBe('function');
    expect(typeof manager.update).toBe('function');
  });
});
