import { globalShortcut, BrowserWindow, app } from 'electron';
import type { SettingsService } from '../settings/settings-service';
import type { SettingsSchema } from '../settings/settings-types';
import { createLogger } from '../logger';

// Extend App type to include isQuiting flag
declare global {
  namespace Electron {
    interface App {
      isQuiting?: boolean;
    }
  }
}

const log = createLogger('keyboard');

type KeyboardSettings = SettingsSchema['keyboard'];

export class KeyboardShortcutManager {
  constructor(private settingsService: SettingsService) {}

  register(): void {
    const kb = this.settingsService.get('keyboard') as unknown as KeyboardSettings;

    // General shortcuts
    this.registerShortcut(kb.general.openSettings, 'openSettings');
    this.registerShortcut(kb.general.togglePiP, 'togglePiP');
    this.registerShortcut(kb.general.closeWindow, 'closeWindow');
    this.registerShortcut(kb.general.quitApp, 'quitApp');

    // Agent shortcuts
    this.registerShortcut(kb.agents.launchAgent, 'launchAgent');
    this.registerShortcut(kb.agents.stopAgent, 'stopAgent');
    this.registerShortcut(kb.agents.nextAgent, 'nextAgent');
    this.registerShortcut(kb.agents.previousAgent, 'previousAgent');

    // Navigation shortcuts
    this.registerShortcut(kb.navigation.toggleSidebar, 'toggleSidebar');
    this.registerShortcut(kb.navigation.openCommandPalette, 'openCommandPalette');
  }

  private registerShortcut(accelerator: string | null | undefined, action: string): void {
    if (!accelerator) return;
    try {
      globalShortcut.register(accelerator, () => {
        this.handleAction(action);
      });
    } catch (error) {
      log.warn('Failed to register shortcut %s: %o', accelerator, error);
    }
  }

  private handleAction(action: string): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    switch (action) {
      case 'openSettings':
        win.webContents.send('navigate', '/settings');
        break;
      case 'togglePiP':
        win.webContents.send('pip:toggle');
        break;
      case 'closeWindow':
        win.close();
        break;
      case 'quitApp':
        app.isQuiting = true;
        app.quit();
        break;
      case 'openCommandPalette':
        win.webContents.send('shortcut', 'openCommandPalette');
        break;
      default:
        // Forward other actions to renderer
        win.webContents.send('shortcut', action);
        break;
    }
  }

  unregister(): void {
    globalShortcut.unregisterAll();
  }

  update(): void {
    this.unregister();
    this.register();
  }
}
