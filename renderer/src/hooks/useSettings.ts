import { useState, useEffect, useCallback } from 'react';
import type { SettingsSchema } from '../../../src/main/settings/settings-types';

export function useSettings() {
  const [settings, setSettings] = useState<SettingsSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (window.api?.settings) {
      window.api.settings.getAll().then((data) => {
        setSettings(data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const set = useCallback(async (path: string, value: unknown) => {
    if (window.api?.settings) {
      await window.api.settings.set(path, value);
      const updated = await window.api.settings.getAll();
      setSettings(updated);
    }
  }, []);

  const reset = useCallback(async () => {
    if (window.api?.settings) {
      await window.api.settings.reset();
      const updated = await window.api.settings.getAll();
      setSettings(updated);
    }
  }, []);

  return { settings, set, reset, isLoading };
}
