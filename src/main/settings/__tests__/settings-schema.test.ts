import { describe, it, expect } from 'vitest';
import { getDefaultSettings } from '../settings-defaults';
import type { SettingsSchema } from '../settings-types';

describe('Settings Schema', () => {
  it('includes openCommandPalette in keyboard.navigation', () => {
    const defaults = getDefaultSettings();
    expect(defaults.keyboard.navigation).toHaveProperty('openCommandPalette');
    expect(typeof defaults.keyboard.navigation.openCommandPalette).toBe('string');
  });

  it('includes search.recent array', () => {
    const defaults = getDefaultSettings();
    expect(defaults.search).toHaveProperty('recent');
    expect(Array.isArray(defaults.search.recent)).toBe(true);
    expect(defaults.search.recent).toEqual([]);
  });

  it('openCommandPalette defaults to Ctrl+K on Windows', () => {
    const defaults = getDefaultSettings();
    expect(defaults.keyboard.navigation.openCommandPalette).toBe('Ctrl+K');
  });
});
