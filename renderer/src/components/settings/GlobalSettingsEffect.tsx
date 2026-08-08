import { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function GlobalSettingsEffect() {
  const { settings } = useSettings();

  // Theme sync
  useEffect(() => {
    const theme = settings?.general.theme;
    if (!theme) return;

    const applyTheme = () => {
      const isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [settings?.general.theme]);

  // Font size sync
  useEffect(() => {
    const fontSize = settings?.general.fontSize;
    if (!fontSize) return;
    const sizeMap = { small: '11px', medium: '13px', large: '16px' };
    document.documentElement.style.setProperty('--text-base', sizeMap[fontSize]);
  }, [settings?.general.fontSize]);

  return null;
}
