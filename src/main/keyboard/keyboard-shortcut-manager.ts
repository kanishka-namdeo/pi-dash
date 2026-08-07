import { globalShortcut, BrowserWindow, app } from 'electron';
import type { SettingsService } from '../settings/settings-service';
import type { SettingsSchema } from '../settings/settings-types';

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
    this.registerShortcut(kb.navigation.dashboardView, 'dashboardView');
    this.registerShortcut(kb.navigation.terminalView, 'terminalView');
    this.registerShortcut(kb.navigation.toggleSidebar, 'toggleSidebar');
  }

  private registerShortcut(accelerator: string, action: string): void {
    try {
      globalShortcut.register(accelerator, () => {
        this.handleAction(action);
      });
    } catch (error) {
      console.warn(`Failed to register shortcut ${accelerator}:`, error);
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
        app.quit();
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
