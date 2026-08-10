import { ipcMain } from 'electron';
import type { SettingsService } from '../settings/settings-service';
import log from '../logger';

type RecentSearch = { term: string; timestamp: number };

export function registerSearchHandlers(settingsService: SettingsService): void {
  ipcMain.handle('search:getRecent', () => {
    try {
      const recent = settingsService.get('search.recent') as RecentSearch[] | undefined;
      return recent || [];
    } catch (err) {
      log.error('Failed to get recent searches', { error: err });
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('search:addRecent', (_event, term: string) => {
    if (!term || !term.trim()) {
      return { success: false, error: 'Empty term' };
    }
    try {
      const trimmedTerm = term.trim();
      const recent = (settingsService.get('search.recent') as RecentSearch[]) || [];
      const filtered = recent.filter(r => r.term !== trimmedTerm);
      filtered.unshift({ term: trimmedTerm, timestamp: Date.now() });
      const trimmed = filtered.slice(0, 10);
      settingsService.set('search.recent', trimmed);
      log.info(`Saved search term: ${term}`);
      return { success: true };
    } catch (err) {
      log.error('Failed to add recent search', { error: err });
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('search:clearRecent', () => {
    try {
      settingsService.set('search.recent', []);
      log.info('Cleared recent searches');
      return { success: true };
    } catch (err) {
      log.error('Failed to clear recent searches', { error: err });
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
}
