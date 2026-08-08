import { ipcMain } from 'electron';
import type { SettingsService } from '../settings/settings-service';
import { createLogger } from '../logger';

const log = createLogger('search');

type RecentSearch = { term: string; timestamp: number };

export function registerSearchHandlers(settingsService: SettingsService): void {
  ipcMain.handle('search:getRecent', () => {
    const recent = settingsService.get('search.recent') as RecentSearch[] | undefined;
    return recent || [];
  });

  ipcMain.handle('search:addRecent', (_event, term: string) => {
    if (!term || !term.trim()) {
      return { success: false, error: 'Empty term' };
    }
    const recent = (settingsService.get('search.recent') as RecentSearch[]) || [];
    const filtered = recent.filter(r => r.term !== term);
    filtered.unshift({ term: term.trim(), timestamp: Date.now() });
    const trimmed = filtered.slice(0, 10);
    settingsService.set('search.recent', trimmed);
    log.info('addRecent', `Saved search term: ${term}`);
    return { success: true };
  });

  ipcMain.handle('search:clearRecent', () => {
    settingsService.set('search.recent', []);
    log.info('clearRecent', 'Cleared recent searches');
    return { success: true };
  });
}
