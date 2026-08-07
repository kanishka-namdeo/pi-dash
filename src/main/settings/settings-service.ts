import Store from 'electron-store';
import { app } from 'electron';
import type { SettingsSchema } from './settings-types';
import { getDefaultSettings } from './settings-defaults';

export class SettingsService {
  private store: Store<SettingsSchema>;

  constructor() {
    const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');

    this.store = new Store<SettingsSchema>({
      cwd: userDataPath,
      name: 'config',
      defaults: getDefaultSettings(),
    });
  }

  get(path: string): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.store as any).get(path);
  }

  set(path: string, value: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.store as any).set(path, value);
  }

  getAll(): SettingsSchema {
    return this.store.store;
  }

  reset(): void {
    this.store.clear();
    const defaults = getDefaultSettings();
    this.store.store = defaults;
  }

  export(): SettingsSchema {
    return this.store.store;
  }

  import(data: SettingsSchema): void {
    this.store.store = data;
  }
}
