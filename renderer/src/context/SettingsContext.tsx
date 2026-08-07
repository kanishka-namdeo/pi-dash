import { createContext, useContext } from 'react';
import { useSettings } from '../hooks/useSettings';
import type { SettingsSchema } from '../../../src/main/settings/settings-types';

interface SettingsContextValue {
  settings: SettingsSchema | null;
  set: (path: string, value: unknown) => Promise<void>;
  reset: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useSettings();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettingsContext must be used within SettingsProvider');
  }
  return ctx;
}
