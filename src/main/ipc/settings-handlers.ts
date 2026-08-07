import { ipcMain } from 'electron';
import { SettingsService } from '../settings/settings-service';
import type { SettingsSchema } from '../settings/settings-types';

let settingsService: SettingsService | null = null;

function getService(): SettingsService {
  if (!settingsService) {
    settingsService = new SettingsService();
  }
  return settingsService;
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAll', () => {
    return getService().getAll();
  });

  ipcMain.handle('settings:set', (_event, path: string, value: unknown) => {
    getService().set(path, value);
    return { success: true };
  });

  ipcMain.handle('settings:reset', () => {
    getService().reset();
    return { success: true };
  });

  ipcMain.handle('settings:export', () => {
    return getService().export();
  });

  ipcMain.handle('settings:import', (_event, data: SettingsSchema) => {
    getService().import(data);
    return { success: true };
  });
}
