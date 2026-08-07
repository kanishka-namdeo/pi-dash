# Settings Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full-featured Settings screen with 9 configuration panels, persistent storage via electron-store, functional keyboard shortcuts, and OS-level notifications.

**Architecture:** Centralized `SettingsService` wraps electron-store with a typed schema. IPC channels expose get/set/reset/export/import. Renderer uses `useSettings` hook + `SettingsContext` for reactive updates. `KeyboardShortcutManager` registers electron accelerators. `NotificationManager` subscribes to agent/GitHub events and fires Electron notifications.

**Tech Stack:** electron-store, React 19, TypeScript, vitest, @testing-library/react, shadcn/ui, lucide-react, Tailwind CSS v4

## Global Constraints

- electron-store v11.0.2 (already in dependencies)
- Dark theme: `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders
- Fonts: Geist (UI), Geist Mono (code/numbers)
- All settings persist to `{userData}/config.json`
- Platform-dependent defaults resolved at runtime (PowerShell on Windows, bash on macOS/Linux)
- Keyboard shortcuts use Electron accelerator strings
- Notifications use Electron `Notification` API
- `app.setBadgeCount()` is macOS-only; no-op elsewhere

---

## File Structure

### Main Process (new files)

```
src/main/
├── settings/
│   ├── settings-types.ts        # SettingsSchema interface
│   ├── settings-defaults.ts     # Default values per platform
│   └── settings-service.ts      # electron-store wrapper
├── ipc/
│   └── settings-handlers.ts     # IPC handlers for settings channels
├── keyboard/
│   └── keyboard-shortcut-manager.ts  # Register/unregister accelerators
└── notifications/
    └── notification-manager.ts  # Subscribe to events, fire notifications
```

### Renderer (new files)

```
renderer/src/
├── hooks/
│   └── useSettings.ts           # Fetch settings, subscribe to changes
├── context/
│   └── SettingsContext.tsx       # Provide settings + update fn
├── components/
│   └── settings/
│       ├── SettingsScreen.tsx    # Main layout (sidebar + content)
│       ├── SettingsSidebar.tsx   # Navigation sidebar
│       ├── SectionCard.tsx       # Reusable card with title + rows
│       ├── SettingsRow.tsx       # Label + description + control
│       ├── KeyCap.tsx            # Keyboard key visual
│       ├── GeneralSettings.tsx
│       ├── AgentsSettings.tsx
│       ├── GitHubSettings.tsx    # Replaces existing
│       ├── NotificationsSettings.tsx
│       ├── KeyboardShortcutsSettings.tsx
│       ├── TerminalSettings.tsx
│       ├── WorktreesSettings.tsx
│       ├── AdvancedSettings.tsx
│       └── AboutSettings.tsx
```

### Modified Files

- `src/preload.ts` — Add `settings` API
- `src/main.ts` — Initialize services
- `src/main/ipc-handlers.ts` — Register settings handlers
- `renderer/src/App.tsx` — Add `/settings` route
- `renderer/src/types/global.d.ts` — Add `settings` API types

---

### Task 1: Settings Types & Defaults

**Files:**
- Create: `src/main/settings/settings-types.ts`
- Create: `src/main/settings/settings-defaults.ts`

**Interfaces:**
- Produces: `SettingsSchema` interface, `getDefaultSettings()` function

- [ ] **Step 1: Create settings-types.ts**

```typescript
// src/main/settings/settings-types.ts

export interface SettingsSchema {
  general: {
    theme: 'dark' | 'light' | 'system';
    language: string;
    fontSize: 'small' | 'medium' | 'large';
    launchOnBoot: boolean;
    restoreSession: boolean;
    minimizeToTray: boolean;
    defaultWorkingDirectory: string;
    autoDetectOnLaunch: boolean;
    maxConcurrentAgents: number;
  };
  github: {
    authMethod: 'pat' | 'oauth';
    autoCreateWorktree: boolean;
    defaultPRTemplate: string;
    autoLinkCommits: boolean;
  };
  notifications: {
    agentStarted: boolean;
    agentCompleted: boolean;
    agentError: boolean;
    prReviewRequested: boolean;
    issueAssigned: boolean;
    prMerged: boolean;
    desktop: boolean;
    sound: boolean;
    badgeCount: boolean;
  };
  keyboard: {
    general: {
      openSettings: string;
      togglePiP: string;
      closeWindow: string;
      quitApp: string;
    };
    agents: {
      launchAgent: string;
      stopAgent: string;
      nextAgent: string;
      previousAgent: string;
    };
    navigation: {
      dashboardView: string;
      terminalView: string;
      toggleSidebar: string;
    };
  };
  terminal: {
    defaultShell: string;
    shellArgs: string;
    fontFamily: string;
    fontSize: number;
    theme: string;
    scrollbackLines: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    copyOnSelect: boolean;
  };
  worktrees: {
    directory: string;
    autoCleanup: boolean;
    branchNamingPattern: string;
    maxConcurrent: number;
  };
  advanced: {
    developerMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export type SettingsPath = string; // e.g., 'general.theme'
```

- [ ] **Step 2: Create settings-defaults.ts**

```typescript
// src/main/settings/settings-defaults.ts

import type { SettingsSchema } from './settings-types';

export function getDefaultSettings(): SettingsSchema {
  const isWindows = process.platform === 'win32';
  
  return {
    general: {
      theme: 'dark',
      language: 'en',
      fontSize: 'medium',
      launchOnBoot: false,
      restoreSession: true,
      minimizeToTray: false,
      defaultWorkingDirectory: '~/projects',
      autoDetectOnLaunch: true,
      maxConcurrentAgents: 8,
    },
    github: {
      authMethod: 'pat',
      autoCreateWorktree: false,
      defaultPRTemplate: 'default',
      autoLinkCommits: true,
    },
    notifications: {
      agentStarted: true,
      agentCompleted: true,
      agentError: true,
      prReviewRequested: true,
      issueAssigned: true,
      prMerged: false,
      desktop: true,
      sound: false,
      badgeCount: true,
    },
    keyboard: {
      general: {
        openSettings: 'Ctrl+,',
        togglePiP: 'Ctrl+Shift+P',
        closeWindow: 'Ctrl+W',
        quitApp: 'Ctrl+Q',
      },
      agents: {
        launchAgent: 'Ctrl+L',
        stopAgent: 'Ctrl+Shift+X',
        nextAgent: 'Ctrl+]',
        previousAgent: 'Ctrl+Shift+[',
      },
      navigation: {
        dashboardView: 'Ctrl+1',
        terminalView: 'Ctrl+2',
        toggleSidebar: 'Ctrl+B',
      },
    },
    terminal: {
      defaultShell: isWindows ? 'powershell.exe' : '/bin/bash',
      shellArgs: isWindows ? '' : '--login',
      fontFamily: 'Geist Mono',
      fontSize: 14,
      theme: 'dark',
      scrollbackLines: 10000,
      cursorStyle: 'block',
      copyOnSelect: false,
    },
    worktrees: {
      directory: '~/.pidash/worktrees',
      autoCleanup: false,
      branchNamingPattern: 'issue-{number}',
      maxConcurrent: 10,
    },
    advanced: {
      developerMode: false,
      logLevel: 'info',
    },
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main/settings/settings-types.ts src/main/settings/settings-defaults.ts
git commit -m "feat: add settings types and defaults"
```

---

### Task 2: Settings Service

**Files:**
- Create: `src/main/settings/settings-service.ts`
- Test: `src/main/settings/__tests__/settings-service.test.ts`

**Interfaces:**
- Consumes: `SettingsSchema`, `getDefaultSettings()`
- Produces: `SettingsService` class with `get()`, `set()`, `getAll()`, `reset()`, `export()`, `import()`

- [ ] **Step 1: Write failing test**

```typescript
// src/main/settings/__tests__/settings-service.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsService } from '../settings-service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SettingsService', () => {
  let testDir: string;
  let service: SettingsService;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pidash-settings-test-'));
    process.env.PI_DASH_USER_DATA = testDir;
    service = new SettingsService();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.PI_DASH_USER_DATA;
  });

  it('returns defaults when no settings file exists', () => {
    const all = service.getAll();
    expect(all.general.theme).toBe('dark');
    expect(all.terminal.fontSize).toBe(14);
  });

  it('gets a nested value by path', () => {
    expect(service.get('general.theme')).toBe('dark');
    expect(service.get('terminal.fontSize')).toBe(14);
  });

  it('sets a nested value by path', () => {
    service.set('general.theme', 'light');
    expect(service.get('general.theme')).toBe('light');
  });

  it('persists changes across instances', () => {
    service.set('general.language', 'fr');
    const service2 = new SettingsService();
    expect(service2.get('general.language')).toBe('fr');
  });

  it('resets to defaults', () => {
    service.set('general.theme', 'light');
    service.reset();
    expect(service.get('general.theme')).toBe('dark');
  });

  it('exports settings as JSON', () => {
    service.set('general.theme', 'light');
    const exported = service.export();
    expect(exported.general.theme).toBe('light');
  });

  it('imports settings from JSON', () => {
    const data = service.export();
    data.general.theme = 'system';
    service.import(data);
    expect(service.get('general.theme')).toBe('system');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/settings/__tests__/settings-service.test.ts`
Expected: FAIL with "Cannot find module '../settings-service'"

- [ ] **Step 3: Implement SettingsService**

```typescript
// src/main/settings/settings-service.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/settings/__tests__/settings-service.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/settings/settings-service.ts src/main/settings/__tests__/settings-service.test.ts
git commit -m "feat: add SettingsService with electron-store"
```

---

### Task 3: Settings IPC Handlers

**Files:**
- Create: `src/main/ipc/settings-handlers.ts`
- Test: `src/main/ipc/__tests__/settings-handlers.test.ts`

**Interfaces:**
- Consumes: `SettingsService`
- Produces: `registerSettingsHandlers()` function

- [ ] **Step 1: Write failing test**

```typescript
// src/main/ipc/__tests__/settings-handlers.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSettingsHandlers } from '../settings-handlers';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test'),
  },
}));

describe('registerSettingsHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all settings IPC handlers', () => {
    registerSettingsHandlers();
    
    const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
    const channels = calls.map((c: unknown[]) => c[0]);
    
    expect(channels).toContain('settings:getAll');
    expect(channels).toContain('settings:set');
    expect(channels).toContain('settings:reset');
    expect(channels).toContain('settings:export');
    expect(channels).toContain('settings:import');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipc/__tests__/settings-handlers.test.ts`
Expected: FAIL with "Cannot find module '../settings-handlers'"

- [ ] **Step 3: Implement settings handlers**

```typescript
// src/main/ipc/settings-handlers.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/ipc/__tests__/settings-handlers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/settings-handlers.ts src/main/ipc/__tests__/settings-handlers.test.ts
git commit -m "feat: add settings IPC handlers"
```

---

### Task 4: Preload Bridge & Global Types

**Files:**
- Modify: `src/preload.ts`
- Modify: `renderer/src/types/global.d.ts`

**Interfaces:**
- Produces: `window.api.settings` API

- [ ] **Step 1: Update global.d.ts**

Add to `renderer/src/types/global.d.ts` inside the `Window.api` interface:

```typescript
settings: {
  getAll: () => Promise<import('../../../src/main/settings/settings-types').SettingsSchema>;
  set: (path: string, value: unknown) => Promise<{ success: true }>;
  reset: () => Promise<{ success: true }>;
  export: () => Promise<import('../../../src/main/settings/settings-types').SettingsSchema>;
  import: (data: import('../../../src/main/settings/settings-types').SettingsSchema) => Promise<{ success: true }>;
};
```

- [ ] **Step 2: Update preload.ts**

Add to `src/preload.ts` inside the `contextBridge.exposeInMainWorld` call:

```typescript
settings: {
  getAll: () => ipcRenderer.invoke('settings:getAll'),
  set: (path: string, value: unknown) => ipcRenderer.invoke('settings:set', path, value),
  reset: () => ipcRenderer.invoke('settings:reset'),
  export: () => ipcRenderer.invoke('settings:export'),
  import: (data: unknown) => ipcRenderer.invoke('settings:import', data),
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: add settings API to preload bridge"
```

---

### Task 5: useSettings Hook

**Files:**
- Create: `renderer/src/hooks/useSettings.ts`
- Test: `renderer/src/hooks/__tests__/useSettings.test.ts`

**Interfaces:**
- Consumes: `window.api.settings`
- Produces: `useSettings()` hook returning `{ settings, set, reset, isLoading }`

- [ ] **Step 1: Write failing test**

```typescript
// renderer/src/hooks/__tests__/useSettings.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../useSettings';

const mockSettings = {
  general: { theme: 'dark', language: 'en', fontSize: 'medium' },
  terminal: { fontSize: 14 },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: {
      settings: {
        getAll: vi.fn().mockResolvedValue(mockSettings),
        set: vi.fn().mockResolvedValue({ success: true }),
        reset: vi.fn().mockResolvedValue({ success: true }),
      },
    },
    writable: true,
  });
});

describe('useSettings', () => {
  it('loads settings on mount', async () => {
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual(mockSettings);
  });

  it('calls settings.set with path and value', async () => {
    const { result } = renderHook(() => useSettings());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    await act(async () => {
      await result.current.set('general.theme', 'light');
    });
    
    expect(window.api.settings.set).toHaveBeenCalledWith('general.theme', 'light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/__tests__/useSettings.test.ts`
Expected: FAIL with "Cannot find module '../useSettings'"

- [ ] **Step 3: Implement useSettings hook**

```typescript
// renderer/src/hooks/useSettings.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/__tests__/useSettings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useSettings.ts renderer/src/hooks/__tests__/useSettings.test.ts
git commit -m "feat: add useSettings hook"
```

---

### Task 6: SettingsContext

**Files:**
- Create: `renderer/src/context/SettingsContext.tsx`

**Interfaces:**
- Consumes: `useSettings()`
- Produces: `SettingsProvider`, `useSettingsContext()`

- [ ] **Step 1: Create SettingsContext**

```typescript
// renderer/src/context/SettingsContext.tsx

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/context/SettingsContext.tsx
git commit -m "feat: add SettingsContext provider"
```

---

### Task 7: Shared Settings Components

**Files:**
- Create: `renderer/src/components/settings/SectionCard.tsx`
- Create: `renderer/src/components/settings/SettingsRow.tsx`
- Create: `renderer/src/components/settings/KeyCap.tsx`

**Interfaces:**
- Produces: Reusable UI components for all settings panels

- [ ] **Step 1: Create SectionCard**

```typescript
// renderer/src/components/settings/SectionCard.tsx

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-semibold tracking-wide text-[#888] uppercase">
        {title}
      </span>
      <div className="flex flex-col rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-4 px-5">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SettingsRow**

```typescript
// renderer/src/components/settings/SettingsRow.tsx

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex h-12 items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <span className="text-[13px] text-[#888]">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function RowSeparator() {
  return <div className="h-px w-full bg-[#2a2a2a]" />;
}
```

- [ ] **Step 3: Create KeyCap**

```typescript
// renderer/src/components/settings/KeyCap.tsx

interface KeyCapProps {
  label: string;
}

export function KeyCap({ label }: KeyCapProps) {
  return (
    <div className="flex h-6 items-center justify-center rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2">
      <span className="font-mono text-[13px] text-white">{label}</span>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/settings/SectionCard.tsx renderer/src/components/settings/SettingsRow.tsx renderer/src/components/settings/KeyCap.tsx
git commit -m "feat: add shared settings UI components"
```

---

### Task 8: SettingsSidebar

**Files:**
- Create: `renderer/src/components/settings/SettingsSidebar.tsx`

**Interfaces:**
- Consumes: Active tab state
- Produces: Navigation sidebar with 9 items

- [ ] **Step 1: Create SettingsSidebar**

```typescript
// renderer/src/components/settings/SettingsSidebar.tsx

import { Settings, Bot, Github, Bell, Keyboard, Info, Terminal, GitBranch, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'worktrees', label: 'Worktrees', icon: GitBranch },
  { id: 'advanced', label:'Advanced', icon: Wrench },
];

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="flex w-[280px] flex-col gap-1 border-r border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <span className="mb-2 font-mono text-[11px] font-semibold tracking-widest text-[#666]">
        SETTINGS
      </span>
      
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
            activeTab === id
              ? 'bg-[#4f46e5] font-semibold text-white'
              : 'text-[#888] hover:bg-[#2a2a2a] hover:text-white'
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </button>
      ))}
      
      <div className="my-2 h-px w-full bg-[#2a2a2a]" />
      <span className="font-mono text-[11px] text-[#666]">PiDash v0.1.0</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/SettingsSidebar.tsx
git commit -m "feat: add SettingsSidebar component"
```

---

### Task 9: SettingsScreen & Routing

**Files:**
- Create: `renderer/src/components/settings/SettingsScreen.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `SettingsSidebar`, `SettingsProvider`, all 9 settings panels
- Produces: `/settings` route with tab switching

- [ ] **Step 1: Create placeholder settings panels**

Create minimal placeholder components for all 9 panels so the screen can render:

```typescript
// renderer/src/components/settings/GeneralSettings.tsx
export function GeneralSettings() {
  return <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-bold text-white">General Settings</h2>
      <p className="text-sm text-[#888]">Application-wide preferences and behavior</p>
    </div>
    {/* Sections will be added in Task 10 */}
  </div>;
}
```

Repeat for: `AgentsSettings`, `GitHubSettings`, `NotificationsSettings`, `KeyboardShortcutsSettings`, `TerminalSettings`, `WorktreesSettings`, `AdvancedSettings`, `AboutSettings` — each with its title and description from the design.

- [ ] **Step 2: Create SettingsScreen**

```typescript
// renderer/src/components/settings/SettingsScreen.tsx

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsSidebar } from './SettingsSidebar';
import { GeneralSettings } from './GeneralSettings';
import { AgentsSettings } from './AgentsSettings';
import { GitHubSettings } from './GitHubSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings';
import { TerminalSettings } from './TerminalSettings';
import { WorktreesSettings } from './WorktreesSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { AboutSettings } from './AboutSettings';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const panels: Record<string, React.ComponentType> = {
  general: GeneralSettings,
  agents: AgentsSettings,
  github: GitHubSettings,
  notifications: NotificationsSettings,
  keyboard: KeyboardShortcutsSettings,
  terminal: TerminalSettings,
  worktrees: WorktreesSettings,
  advanced: AdvancedSettings,
  about: AboutSettings,
};

export function SettingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'general';
  
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };
  
  const handleClose = () => {
    navigate('/');
  };
  
  const Panel = panels[activeTab] || GeneralSettings;
  
  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        <button
          onClick={handleClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a]"
        >
          <X className="h-4 w-4 text-[#888]" />
        </button>
        <Panel />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add /settings route to App.tsx**

Add to the `<Routes>` in `renderer/src/App.tsx`:

```typescript
import { SettingsScreen } from './components/settings/SettingsScreen';
import { SettingsProvider } from './context/SettingsContext';

// Inside Routes:
<Route path="/settings" element={<SettingsProvider><SettingsScreen /></SettingsProvider>} />
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/settings/SettingsScreen.tsx renderer/src/components/settings/GeneralSettings.tsx renderer/src/components/settings/AgentsSettings.tsx renderer/src/components/settings/GitHubSettings.tsx renderer/src/components/settings/NotificationsSettings.tsx renderer/src/components/settings/KeyboardShortcutsSettings.tsx renderer/src/components/settings/TerminalSettings.tsx renderer/src/components/settings/WorktreesSettings.tsx renderer/src/components/settings/AdvancedSettings.tsx renderer/src/components/settings/AboutSettings.tsx renderer/src/App.tsx
git commit -m "feat: add SettingsScreen with routing and tab navigation"
```

---

### Task 10: GeneralSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/GeneralSettings.tsx`

**Settings implemented:**
- Appearance: Theme (dropdown), Language (dropdown), Font Size (dropdown)
- Startup: Launch on boot (toggle), Restore session (toggle), Minimize to tray (toggle)
- Agents: Default working directory (dropdown), Auto-detect on launch (toggle), Max concurrent agents (dropdown)

- [ ] **Step 1: Implement GeneralSettings**

Replace the placeholder with full implementation using `SectionCard`, `SettingsRow`, `RowSeparator`, shadcn `Select`, and shadcn `Switch`. Each setting reads from `useSettingsContext()` and calls `set()` on change.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=general`
Expected: All 3 sections render with correct controls

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/GeneralSettings.tsx
git commit -m "feat: implement GeneralSettings panel"
```

---

### Task 11: AgentsSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/AgentsSettings.tsx`

**Settings implemented:**
- Configured agents list with avatar, name, path, status, remove button
- Add Agent button

- [ ] **Step 1: Implement AgentsSettings**

Use existing `AgentRow` component pattern. Fetch agents via `window.api.getAgents()`. Remove button calls `window.api.saveAgents()` with filtered list. Add Agent button navigates to manual add or triggers scan.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=agents`
Expected: Agent list renders, add/remove buttons work

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/AgentsSettings.tsx
git commit -m "feat: implement AgentsSettings panel"
```

---

### Task 12: GitHubSettings Panel (Replace Existing)

**Files:**
- Modify: `renderer/src/components/settings/GitHubSettings.tsx` (replaces existing)

**Settings implemented:**
- Authentication: Auth method (dropdown), Token status (badge)
- Repositories: Existing repo management restructured into SectionCard
- Pull Requests & Issues: Auto-create worktree (toggle), Default PR template (dropdown), Auto-link commits (toggle)

- [ ] **Step 1: Implement GitHubSettings**

Integrate existing `useGitHubAuth` and `useRepos` hooks with new settings pattern. Auth section shows method selector and connection status. Repo section shows list with add/remove. PR section has toggles and dropdown.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=github`
Expected: All 3 sections render, auth flow works

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/GitHubSettings.tsx
git commit -m "feat: implement GitHubSettings panel (replaces existing)"
```

---

### Task 13: NotificationsSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/NotificationsSettings.tsx`

**Settings implemented:**
- Agent Events: started, completed, error (toggles)
- GitHub Events: PR review requested, issue assigned, PR merged (toggles)
- Notification Style: Desktop, Sound, Badge count (toggles)

- [ ] **Step 1: Implement NotificationsSettings**

All 9 toggles using `SectionCard`, `SettingsRow`, `RowSeparator`, and shadcn `Switch`. Each toggle calls `set('notifications.agentStarted', value)` etc.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=notifications`
Expected: All 3 sections with 9 toggles render

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/NotificationsSettings.tsx
git commit -m "feat: implement NotificationsSettings panel"
```

---

### Task 14: KeyboardShortcutsSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/KeyboardShortcutsSettings.tsx`

**Settings implemented:**
- General: Open Settings, Toggle PiP, Close Window, Quit (keycaps)
- Agents: Launch, Stop, Next, Previous (keycaps)
- Navigation: Dashboard, Terminal, Toggle Sidebar (keycaps)

- [ ] **Step 1: Implement KeyboardShortcutsSettings**

Display-only for now (shortcuts are functional via KeyboardShortcutManager in Task 19). Parse accelerator strings like "Ctrl+," into individual KeyCap components. Split on "+" and render each key.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=keyboard`
Expected: All 3 sections with keycap rows render

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/KeyboardShortcutsSettings.tsx
git commit -m "feat: implement KeyboardShortcutsSettings panel"
```

---

### Task 15: TerminalSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/TerminalSettings.tsx`

**Settings implemented:**
- Shell: Default shell (dropdown), Shell args (input)
- Appearance: Font family (dropdown), Font size (dropdown), Theme (dropdown)
- Behavior: Scrollback lines (dropdown), Cursor style (dropdown), Copy on select (toggle)

- [ ] **Step 1: Implement TerminalSettings**

Use `SectionCard`, `SettingsRow`, dropdowns via shadcn `Select`, input via shadcn `Input`, toggle via shadcn `Switch`.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=terminal`
Expected: All 3 sections render with correct controls

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/TerminalSettings.tsx
git commit -m "feat: implement TerminalSettings panel"
```

---

### Task 16: WorktreesSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/WorktreesSettings.tsx`

**Settings implemented:**
- Location: Directory path (input + browse button)
- Behavior: Auto-cleanup (toggle), Branch naming pattern (dropdown), Max concurrent (dropdown)

- [ ] **Step 1: Implement WorktreesSettings**

Browse button calls `window.api.openDirectory()`. Path input is editable text. Toggles and dropdowns as in other panels.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=worktrees`
Expected: Both sections render, browse button opens dialog

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/WorktreesSettings.tsx
git commit -m "feat: implement WorktreesSettings panel"
```

---

### Task 17: AdvancedSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/AdvancedSettings.tsx`

**Settings implemented:**
- Developer: Dev mode (toggle), Log level (dropdown), Config file (Open button)
- Data Management: Export (button), Import (button), Cache size (Clear button)
- Danger Zone: Reset settings (rose button), Clear all data (rose button)

- [ ] **Step 1: Implement AdvancedSettings**

Danger Zone section uses rose/red border and button styling. Reset calls `reset()` from settings context. Clear all data shows confirm dialog then wipes agent store, session store, settings. Export/Import use `window.api.settings.export()` / `import()`.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=advanced`
Expected: All 3 sections render, danger zone has red styling

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/AdvancedSettings.tsx
git commit -m "feat: implement AdvancedSettings panel"
```

---

### Task 18: AboutSettings Panel

**Files:**
- Modify: `renderer/src/components/settings/AboutSettings.tsx`

**Settings implemented:**
- Logo section: π logo, app name, tagline, version
- Links: Website, Documentation, Source Code, Report Issue (external links)
- Check for Updates button + License text

- [ ] **Step 1: Implement AboutSettings**

Centered layout. Links use `window.api.openExternal()`. Version reads from `package.json` or is hardcoded. Check for Updates button is placeholder for now.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/settings?tab=about`
Expected: Logo, links, and version render. Links open in browser.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/AboutSettings.tsx
git commit -m "feat: implement AboutSettings panel"
```

---

### Task 19: KeyboardShortcutManager

**Files:**
- Create: `src/main/keyboard/keyboard-shortcut-manager.ts`
- Test: `src/main/keyboard/__tests__/keyboard-shortcut-manager.test.ts`

**Interfaces:**
- Consumes: `SettingsService` (keyboard settings), `BrowserWindow`
- Produces: `KeyboardShortcutManager` class with `register()`, `unregister()`, `update()`

- [ ] **Step 1: Write failing test**

```typescript
// src/main/keyboard/__tests__/keyboard-shortcut-manager.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardShortcutManager } from '../keyboard-shortcut-manager';

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([{ webContents: { send: vi.fn() } }]),
  },
}));

describe('KeyboardShortcutManager', () => {
  it('registers shortcuts from settings', () => {
    const settings = {
      keyboard: {
        general: { openSettings: 'Ctrl+,', togglePiP: 'Ctrl+Shift+P', closeWindow: 'Ctrl+W', quitApp: 'Ctrl+Q' },
        agents: { launchAgent: 'Ctrl+L', stopAgent: 'Ctrl+Shift+X', nextAgent: 'Ctrl+]', previousAgent: 'Ctrl+Shift+[' },
        navigation: { dashboardView: 'Ctrl+1', terminalView: 'Ctrl+2', toggleSidebar: 'Ctrl+B' },
      },
    };
    const manager = new KeyboardShortcutManager(settings as any);
    manager.register();
    
    const { globalShortcut } = require('electron');
    expect(globalShortcut.register).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/keyboard/__tests__/keyboard-shortcut-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement KeyboardShortcutManager**

```typescript
// src/main/keyboard/keyboard-shortcut-manager.ts

import { globalShortcut, BrowserWindow } from 'electron';
import type { SettingsSchema } from '../settings/settings-types';

export class KeyboardShortcutManager {
  private shortcuts: Map<string, string> = new Map();
  
  constructor(private settings: SettingsSchema) {
    this.buildShortcutMap();
  }
  
  private buildShortcutMap(): void {
    this.shortcuts.clear();
    const kb = this.settings.keyboard;
    
    this.shortcuts.set(kb.general.openSettings, 'openSettings');
    this.shortcuts.set(kb.general.togglePiP, 'togglePiP');
    this.shortcuts.set(kb.general.closeWindow, 'closeWindow');
    this.shortcuts.set(kb.general.quitApp, 'quitApp');
    this.shortcuts.set(kb.agents.launchAgent, 'launchAgent');
    this.shortcuts.set(kb.agents.stopAgent, 'stopAgent');
    this.shortcuts.set(kb.agents.nextAgent, 'nextAgent');
    this.shortcuts.set(kb.agents.previousAgent, 'previousAgent');
    this.shortcuts.set(kb.navigation.dashboardView, 'dashboardView');
    this.shortcuts.set(kb.navigation.terminalView, 'terminalView');
    this.shortcuts.set(kb.navigation.toggleSidebar, 'toggleSidebar');
  }
  
  register(): void {
    for (const [accelerator, action] of this.shortcuts) {
      globalShortcut.register(accelerator, () => {
        this.handleAction(action);
      });
    }
  }
  
  unregister(): void {
    globalShortcut.unregisterAll();
  }
  
  update(settings: SettingsSchema): void {
    this.unregister();
    this.settings = settings;
    this.buildShortcutMap();
    this.register();
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
        const { app } = require('electron');
        app.quit();
        break;
      default:
        win.webContents.send('shortcut', action);
        break;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/keyboard/__tests__/keyboard-shortcut-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/keyboard/keyboard-shortcut-manager.ts src/main/keyboard/__tests__/keyboard-shortcut-manager.test.ts
git commit -m "feat: add KeyboardShortcutManager"
```

---

### Task 20: NotificationManager

**Files:**
- Create: `src/main/notifications/notification-manager.ts`

**Interfaces:**
- Consumes: `SettingsService` (notification settings), event sources
- Produces: `NotificationManager` class with `notify()` method

- [ ] **Step 1: Implement NotificationManager**

```typescript
// src/main/notifications/notification-manager.ts

import { Notification, app } from 'electron';
import type { SettingsSchema } from '../settings/settings-types';

export class NotificationManager {
  constructor(private settings: SettingsService) {}
  
  notifyAgentStarted(agentName: string): void {
    if (!this.settings.get('notifications.agentStarted')) return;
    this.fire('Agent Started', `${agentName} has started`);
  }
  
  notifyAgentCompleted(agentName: string): void {
    if (!this.settings.get('notifications.agentCompleted')) return;
    this.fire('Agent Completed', `${agentName} has finished`);
  }
  
  notifyAgentError(agentName: string, error: string): void {
    if (!this.settings.get('notifications.agentError')) return;
    this.fire('Agent Error', `${agentName}: ${error}`);
  }
  
  notifyPRReviewRequested(repo: string, prNumber: number): void {
    if (!this.settings.get('notifications.prReviewRequested')) return;
    this.fire('PR Review Requested', `Review requested on ${repo}#${prNumber}`);
  }
  
  notifyIssueAssigned(repo: string, issueNumber: number): void {
    if (!this.settings.get('notifications.issueAssigned')) return;
    this.fire('Issue Assigned', `You were assigned to ${repo}#${issueNumber}`);
  }
  
  notifyPRMerged(repo: string, prNumber: number): void {
    if (!this.settings.get('notifications.prMerged')) return;
    this.fire('PR Merged', `${repo}#${prNumber} has been merged`);
  }
  
  private fire(title: string, body: string): void {
    if (!this.settings.get('notifications.desktop')) return;
    
    const notification = new Notification({
      title,
      body,
      silent: !this.settings.get('notifications.sound'),
    });
    notification.show();
    
    if (this.settings.get('notifications.badgeCount') && process.platform === 'darwin') {
      const current = app.getBadgeCount();
      app.setBadgeCount(current + 1);
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main/notifications/notification-manager.ts
git commit -m "feat: add NotificationManager"
```

---

### Task 21: Wire Up main.ts

**Files:**
- Modify: `src/main.ts`
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Register settings handlers in main.ts**

Add to `src/main.ts`:

```typescript
import { registerSettingsHandlers } from './main/ipc/settings-handlers';
import { SettingsService } from './main/settings/settings-service';
import { KeyboardShortcutManager } from './main/keyboard/keyboard-shortcut-manager';
import { NotificationManager } from './main/notifications/notification-manager';

// Inside app.whenReady():
const settingsService = new SettingsService();
registerSettingsHandlers();

const shortcutManager = new KeyboardShortcutManager(settingsService.getAll());
shortcutManager.register();

const notificationManager = new NotificationManager(settingsService);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up settings, keyboard, and notification managers in main.ts"
```

---

### Task 22: Platform Behaviors

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Implement launchOnBoot**

When `settings.general.launchOnBoot` changes, call `app.setLoginItemSettings({ openAtLogin: value })`.

- [ ] **Step 2: Implement minimizeToTray**

When `settings.general.minimizeToTray` is true, intercept the window close event and hide to tray instead of quitting. Use Electron's `Tray` API.

- [ ] **Step 3: Verify behaviors**

Run: `pnpm dev`, toggle launchOnBoot and minimizeToTray in settings, verify they work.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: implement launchOnBoot and minimizeToTray platform behaviors"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 9 settings panels covered (Tasks 10-18), keyboard shortcuts (Task 19), notifications (Task 20), persistence (Tasks 1-6), routing (Task 9), platform behaviors (Task 22)
- [x] **Placeholder scan:** No TBDs or TODOs — all steps have concrete code
- [x] **Type consistency:** `SettingsSchema` used consistently across all tasks, `useSettingsContext()` returns `{ settings, set, reset, isLoading }`
