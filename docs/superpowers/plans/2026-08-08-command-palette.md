# Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Ctrl+K` command palette for instant navigation to any surface in PiDash — agents, repos, PRs, branches, settings, and routes.

**Architecture:** Main process handles keyboard shortcut registration and recent searches persistence via electron-store. Preload bridges the search API. Renderer builds a search index from SessionContext, GitHubContext, and useAgents using Fuse.js for fuzzy matching. A React component renders as a portal with focus trap and 5 visual states.

**Tech Stack:** Electron (main/preload), React 19, Fuse.js, react-router-dom, electron-store, lucide-react

## Global Constraints

- **Logging:** Never use `console.log/warn/error` — use `electron-log` via `import log from './logger'` (main) or `import { log } from '@/lib/logger'` (renderer)
- **Package manager:** pnpm
- **Keyboard shortcut default:** `Ctrl+K` on Windows, `Command+K` on Mac
- **Recent searches cap:** 10 items, LRU eviction
- **Fuse.js threshold:** 0.3
- **Design tokens:** All colors via CSS variables (`$bg`, `$card`, `$accent-indigo`, etc.)
- **Component naming:** PascalCase, semantic role-bearing names

---

## File Structure

### New Files (4)
| File | Layer | Responsibility |
|---|---|---|
| `src/main/ipc/search-handlers.ts` | Main | IPC handlers for recent searches persistence |
| `renderer/src/lib/searchIndex.ts` | Renderer | Search item builder + Fuse.js engine |
| `renderer/src/hooks/useCommandPalette.ts` | Renderer | State, keyboard nav, data flow, agent launch |
| `renderer/src/components/CommandPalette.tsx` | Renderer | UI component (portal, focus trap, 5 states) |

### Modified Files (8)
| File | Layer | Change |
|---|---|---|
| `src/main/settings/settings-types.ts` | Main | Add `openCommandPalette` to keyboard.navigation, add `search` section |
| `src/main/settings/settings-defaults.ts` | Main | Add defaults for new settings |
| `src/main/keyboard/keyboard-shortcut-manager.ts` | Main | Register `openCommandPalette` shortcut |
| `src/main.ts` | Main | Register search handlers in `app.whenReady()` |
| `src/preload.ts` | Preload | Add `search` API to contextBridge |
| `renderer/src/types/global.d.ts` | Types | Add `search` to `window.api` interface |
| `renderer/src/App.tsx` | Renderer | Render `<CommandPalette />` at root |
| `renderer/src/components/settings/KeyboardShortcutsSettings.tsx` | Renderer | Show new shortcut in settings UI |

### Dependencies (1)
| Package | Size | Purpose |
|---|---|---|
| `fuse.js` | ~10KB gzipped | Fuzzy search engine |

---

## Task 1: Settings Schema Extension

**Files:**
- Modify: `src/main/settings/settings-types.ts`
- Modify: `src/main/settings/settings-defaults.ts`
- Test: `src/main/settings/__tests__/settings-schema.test.ts`

**Interfaces:**
- Produces: `SettingsSchema.keyboard.navigation.openCommandPalette: string`
- Produces: `SettingsSchema.search.recent: Array<{ term: string; timestamp: number }>`

- [ ] **Step 1: Write failing test for new settings fields**

Create `src/main/settings/__tests__/settings-schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDefaultSettings } from '../settings-defaults';
import type { SettingsSchema } from '../settings-types';

describe('Settings Schema', () => {
  it('includes openCommandPalette in keyboard.navigation', () => {
    const defaults = getDefaultSettings();
    expect(defaults.keyboard.navigation).toHaveProperty('openCommandPalette');
    expect(typeof defaults.keyboard.navigation.openCommandPalette).toBe('string');
  });

  it('includes search.recent array', () => {
    const defaults = getDefaultSettings();
    expect(defaults.search).toHaveProperty('recent');
    expect(Array.isArray(defaults.search.recent)).toBe(true);
    expect(defaults.search.recent).toEqual([]);
  });

  it('openCommandPalette defaults to Ctrl+K on Windows', () => {
    const defaults = getDefaultSettings();
    expect(defaults.keyboard.navigation.openCommandPalette).toBe('Ctrl+K');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/settings/__tests__/settings-schema.test.ts`
Expected: FAIL — `Property 'openCommandPalette' does not exist` and `Property 'search' does not exist`

- [ ] **Step 3: Add openCommandPalette to settings-types.ts**

Edit `src/main/settings/settings-types.ts`, add to `keyboard.navigation`:

```typescript
navigation: {
  dashboardView: string;
  terminalView: string;
  toggleSidebar: string;
  openCommandPalette: string;
};
```

Add new `search` section to `SettingsSchema`:

```typescript
search: {
  recent: Array<{ term: string; timestamp: number }>;
};
```

- [ ] **Step 4: Add defaults to settings-defaults.ts**

Edit `src/main/settings/settings-defaults.ts`, add to `keyboard.navigation`:

```typescript
navigation: {
  dashboardView: 'Ctrl+1',
  terminalView: 'Ctrl+2',
  toggleSidebar: 'Ctrl+B',
  openCommandPalette: 'Ctrl+K',
},
```

Add new `search` section:

```typescript
search: {
  recent: [],
},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/main/settings/__tests__/settings-schema.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/main/settings/settings-types.ts src/main/settings/settings-defaults.ts src/main/settings/__tests__/settings-schema.test.ts
git commit -m "feat(settings): add openCommandPalette and search.recent schema"
```

---

## Task 2: IPC Handlers for Recent Searches

**Files:**
- Create: `src/main/ipc/search-handlers.ts`
- Test: `src/main/ipc/__tests__/search-handlers.test.ts`

**Interfaces:**
- Consumes: `SettingsService` from `src/main/settings/settings-service.ts`
- Produces: `registerSearchHandlers(settingsService: SettingsService): void`
- Produces IPC channels: `search:getRecent`, `search:addRecent`, `search:clearRecent`

- [ ] **Step 1: Write failing test for search handlers**

Create `src/main/ipc/__tests__/search-handlers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSearchHandlers } from '../search-handlers';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('registerSearchHandlers', () => {
  const mockSettingsService = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers three IPC handlers', () => {
    const { ipcMain } = require('electron');
    registerSearchHandlers(mockSettingsService as any);
    expect(ipcMain.handle).toHaveBeenCalledTimes(3);
    expect(ipcMain.handle).toHaveBeenCalledWith('search:getRecent', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('search:addRecent', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('search:clearRecent', expect.any(Function));
  });

  it('getRecent returns empty array when no data', () => {
    const { ipcMain } = require('electron');
    mockSettingsService.get.mockReturnValue(undefined);
    registerSearchHandlers(mockSettingsService as any);
    const getRecentHandler = ipcMain.handle.mock.calls.find((c: any[]) => c[0] === 'search:getRecent')[1];
    const result = getRecentHandler();
    expect(result).toEqual([]);
  });

  it('addRecent prepends term and caps at 10', () => {
    const { ipcMain } = require('electron');
    const existing = Array.from({ length: 10 }, (_, i) => ({ term: `term${i}`, timestamp: i }));
    mockSettingsService.get.mockReturnValue(existing);
    registerSearchHandlers(mockSettingsService as any);
    const addRecentHandler = ipcMain.handle.mock.calls.find((c: any[]) => c[0] === 'search:addRecent')[1];
    addRecentHandler(null, 'newTerm');
    expect(mockSettingsService.set).toHaveBeenCalled();
    const saved = mockSettingsService.set.mock.calls[0][1];
    expect(saved[0].term).toBe('newTerm');
    expect(saved.length).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipc/__tests__/search-handlers.test.ts`
Expected: FAIL — `Cannot find module '../search-handlers'`

- [ ] **Step 3: Implement search-handlers.ts**

Create `src/main/ipc/search-handlers.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/ipc/__tests__/search-handlers.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/search-handlers.ts src/main/ipc/__tests__/search-handlers.test.ts
git commit -m "feat(ipc): add search handlers for recent searches persistence"
```

---

## Task 3: Register Search Handlers in Main Process

**Files:**
- Modify: `src/main.ts`
- Modify: `src/main/keyboard/keyboard-shortcut-manager.ts`

**Interfaces:**
- Consumes: `registerSearchHandlers` from Task 2
- Consumes: `SettingsService` from `src/main/settings/settings-service.ts`

- [ ] **Step 1: Add import and registration to main.ts**

Edit `src/main.ts`, add import at top:

```typescript
import { registerSearchHandlers } from './main/ipc/search-handlers';
```

In `app.whenReady()` callback, after `settingsService = new SettingsService()`, add:

```typescript
registerSearchHandlers(settingsService);
```

- [ ] **Step 2: Add openCommandPalette to keyboard-shortcut-manager.ts**

Edit `src/main/keyboard/keyboard-shortcut-manager.ts`, add to `register()`:

```typescript
this.registerShortcut(kb.navigation.openCommandPalette, 'openCommandPalette');
```

Add case to `handleAction()` switch:

```typescript
case 'openCommandPalette':
  win.webContents.send('shortcut', 'openCommandPalette');
  break;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/main/keyboard/keyboard-shortcut-manager.ts
git commit -m "feat(main): register search handlers and command palette shortcut"
```

---

## Task 4: Preload Bridge and Type Definitions

**Files:**
- Modify: `src/preload.ts`
- Modify: `renderer/src/types/global.d.ts`

**Interfaces:**
- Produces: `window.api.search.getRecent(): Promise<RecentSearch[]>`
- Produces: `window.api.search.addRecent(term: string): Promise<{ success: boolean }>`
- Produces: `window.api.search.clearRecent(): Promise<{ success: boolean }>`

- [ ] **Step 1: Add search API to preload.ts**

Edit `src/preload.ts`, add to `contextBridge.exposeInMainWorld('api', {...})`:

```typescript
search: {
  getRecent: () => ipcRenderer.invoke('search:getRecent'),
  addRecent: (term: string) => ipcRenderer.invoke('search:addRecent', term),
  clearRecent: () => ipcRenderer.invoke('search:clearRecent'),
},
```

- [ ] **Step 2: Add search types to global.d.ts**

Edit `renderer/src/types/global.d.ts`, add to `window.api` interface:

```typescript
search: {
  getRecent: () => Promise<Array<{ term: string; timestamp: number }>>;
  addRecent: (term: string) => Promise<{ success: boolean; error?: string }>;
  clearRecent: () => Promise<{ success: boolean }>;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit && npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat(preload): add search API bridge for recent searches"
```

---

## Task 5: Install Fuse.js Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install fuse.js**

Run: `pnpm add fuse.js`

- [ ] **Step 2: Verify installation**

Run: `pnpm list fuse.js`
Expected: `fuse.js` listed with version

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add fuse.js for fuzzy search"
```

---

## Task 6: Search Index Library

**Files:**
- Create: `renderer/src/lib/searchIndex.ts`
- Test: `renderer/src/lib/searchIndex.test.ts`

**Interfaces:**
- Consumes: `SessionInfo` from `renderer/src/context/SessionContext`
- Consumes: `AgentConfig` from `src/shared/types`
- Consumes: `Repo`, `GitHubPR` from `src/shared/github-types`
- Produces: `SearchItem` type
- Produces: `buildSearchItems(config: SearchIndexConfig): SearchItem[]`
- Produces: `createSearchEngine(items: SearchItem[]): Fuse<SearchItem>`

- [ ] **Step 1: Write failing test for buildSearchItems**

Create `renderer/src/lib/searchIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSearchItems, createSearchEngine } from './searchIndex';
import type { SearchIndexConfig } from './searchIndex';

describe('buildSearchItems', () => {
  const emptyConfig: SearchIndexConfig = {
    runningSessions: [],
    availableAgents: [],
    repos: [],
    prs: [],
    branches: [],
  };

  it('returns route items even with empty config', () => {
    const items = buildSearchItems(emptyConfig);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some(i => i.type === 'route')).toBe(true);
  });

  it('includes running agents', () => {
    const config: SearchIndexConfig = {
      ...emptyConfig,
      runningSessions: [{
        agentId: 'claude-code',
        state: 'running',
        pid: 1234,
        cwd: '/projects/test',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      }],
    };
    const items = buildSearchItems(config);
    const agentItem = items.find(i => i.id === 'agent-running-claude-code');
    expect(agentItem).toBeDefined();
    expect(agentItem?.title).toBe('claude-code');
    expect(agentItem?.icon).toBe('bot');
    expect(agentItem?.iconColor).toBe('$accent-amber');
  });

  it('includes available agents not already running', () => {
    const config: SearchIndexConfig = {
      ...emptyConfig,
      availableAgents: [{
        id: 'aider',
        name: 'Aider',
        icon: 'aider',
        path: '/usr/local/bin/aider',
        source: 'detected',
      }],
    };
    const items = buildSearchItems(config);
    const agentItem = items.find(i => i.id === 'agent-available-aider');
    expect(agentItem).toBeDefined();
    expect(agentItem?.title).toBe('Aider');
    expect(agentItem?.iconColor).toBe('$accent-emerald');
  });

  it('skips available agents that are already running', () => {
    const config: SearchIndexConfig = {
      runningSessions: [{
        agentId: 'aider',
        state: 'running',
        pid: 1234,
        cwd: '/test',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      }],
      availableAgents: [{
        id: 'aider',
        name: 'Aider',
        icon: 'aider',
        path: '/usr/local/bin/aider',
        source: 'detected',
      }],
      repos: [],
      prs: [],
      branches: [],
    };
    const items = buildSearchItems(config);
    expect(items.find(i => i.id === 'agent-available-aider')).toBeUndefined();
  });
});

describe('createSearchEngine', () => {
  it('finds items by title', () => {
    const items = buildSearchItems({
      runningSessions: [],
      availableAgents: [{
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        source: 'detected',
      }],
      repos: [],
      prs: [],
      branches: [],
    });
    const fuse = createSearchEngine(items);
    const results = fuse.search('claude');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.title).toBe('Claude Code');
  });

  it('returns empty for no match', () => {
    const items = buildSearchItems({
      runningSessions: [],
      availableAgents: [],
      repos: [],
      prs: [],
      branches: [],
    });
    const fuse = createSearchEngine(items);
    const results = fuse.search('xyznotfound');
    expect(results.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/searchIndex.test.ts`
Expected: FAIL — `Cannot find module './searchIndex'`

- [ ] **Step 3: Implement searchIndex.ts**

Create `renderer/src/lib/searchIndex.ts`:

```typescript
import Fuse from 'fuse.js';
import type { AgentConfig } from '../../../src/shared/types';
import type { SessionInfo } from '../context/SessionContext';
import type { Repo, GitHubPR } from '../../../src/shared/github-types';

export type SearchItem = {
  id: string;
  type: 'agent-running' | 'agent-available' | 'repo' | 'pr' | 'branch' | 'route' | 'action';
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  route?: string;
  action?: string;
  keywords?: string[];
};

export type SearchIndexConfig = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  repos: Repo[];
  prs: GitHubPR[];
  branches: string[];
};

const ROUTE_ITEMS: SearchItem[] = [
  { id: 'route-dashboard', type: 'route', title: 'Dashboard', description: 'Main fleet view', icon: 'layout-dashboard', iconColor: '$text-secondary', route: '/' },
  { id: 'route-terminal', type: 'route', title: 'Terminal', description: 'Full-screen terminal', icon: 'terminal', iconColor: '$text-secondary', route: '/terminal' },
  { id: 'route-settings', type: 'route', title: 'Settings', description: 'App configuration', icon: 'settings', iconColor: '$text-secondary', route: '/settings' },
  { id: 'route-worktrees', type: 'route', title: 'Worktrees', description: 'Git worktree management', icon: 'git-branch', iconColor: '$text-secondary', route: '/worktrees' },
];

export function buildSearchItems(config: SearchIndexConfig): SearchItem[] {
  const items: SearchItem[] = [];

  for (const session of config.runningSessions) {
    items.push({
      id: `agent-running-${session.agentId}`,
      type: 'agent-running',
      title: session.agentId,
      description: `Running · ${session.cwd}`,
      icon: 'bot',
      iconColor: '$accent-amber',
      route: `/agent/${session.agentId}`,
      keywords: [session.cwd],
    });
  }

  for (const agent of config.availableAgents) {
    const isRunning = config.runningSessions.some(s => s.agentId === agent.id);
    if (isRunning) continue;
    items.push({
      id: `agent-available-${agent.id}`,
      type: 'agent-available',
      title: agent.name,
      description: `Available · ${agent.path}`,
      icon: 'bot',
      iconColor: '$accent-emerald',
      action: `launch:${agent.id}`,
      keywords: [agent.path, agent.name],
    });
  }

  for (const repo of config.repos) {
    items.push({
      id: `repo-${repo.id}`,
      type: 'repo',
      title: `${repo.owner}/${repo.name}`,
      description: repo.localPath,
      icon: 'repo',
      iconColor: '$accent-blue',
      route: '/settings/github',
      keywords: [repo.name, repo.owner],
    });
  }

  for (const pr of config.prs) {
    items.push({
      id: `pr-${pr.number}`,
      type: 'pr',
      title: `PR #${pr.number}`,
      description: pr.title,
      icon: 'git-pull-request',
      iconColor: pr.state === 'open' ? '$accent-emerald' : '$accent-indigo',
      route: `/pr/${pr.number}`,
      keywords: [pr.title, String(pr.number)],
    });
  }

  for (const branch of config.branches) {
    items.push({
      id: `branch-${branch}`,
      type: 'branch',
      title: branch,
      description: 'Branch',
      icon: 'git-branch',
      iconColor: '$accent-blue',
      route: '/worktrees',
      keywords: [branch],
    });
  }

  items.push(...ROUTE_ITEMS);

  return items;
}

export function createSearchEngine(items: SearchItem[]): Fuse<SearchItem> {
  return new Fuse(items, {
    keys: ['title', 'description', 'keywords'],
    threshold: 0.3,
    includeScore: true,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/searchIndex.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add renderer/src/lib/searchIndex.ts renderer/src/lib/searchIndex.test.ts
git commit -m "feat(search): add search index builder and Fuse.js engine"
```

---

## Task 7: useCommandPalette Hook

**Files:**
- Create: `renderer/src/hooks/useCommandPalette.ts`
- Test: `renderer/src/hooks/useCommandPalette.test.ts`

**Interfaces:**
- Consumes: `useSessionContext` from `renderer/src/context/SessionContext`
- Consumes: `useGitHub` from `renderer/src/context/GitHubContext`
- Consumes: `useAgents` from `renderer/src/hooks/useAgents`
- Consumes: `buildSearchItems`, `createSearchEngine` from Task 6
- Produces: `useCommandPalette()` hook with full API

- [ ] **Step 1: Write failing test for hook basics**

Create `renderer/src/hooks/useCommandPalette.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

vi.mock('../context/SessionContext', () => ({
  useSessionContext: () => ({
    sessions: new Map(),
    getActiveSessions: () => [],
    registerSession: vi.fn(),
  }),
}));

vi.mock('../context/GitHubContext', () => ({
  useGitHub: () => ({
    repos: [],
    prs: [],
    branches: [],
  }),
}));

vi.mock('./useAgents', () => ({
  useAgents: () => ({
    agents: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      search: {
        getRecent: vi.fn().mockResolvedValue([]),
        addRecent: vi.fn().mockResolvedValue({ success: true }),
        clearRecent: vi.fn().mockResolvedValue({ success: true }),
      },
      onShortcut: vi.fn(() => vi.fn()),
    };
  });

  it('starts closed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it('opens via open()', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('closes via close()', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('loads recent searches on mount', async () => {
    const { result } = renderHook(() => useCommandPalette());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(window.api.search.getRecent).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/useCommandPalette.test.ts`
Expected: FAIL — `Cannot find module './useCommandPalette'`

- [ ] **Step 3: Implement useCommandPalette.ts**

Create `renderer/src/hooks/useCommandPalette.ts`:

```typescript
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';
import { useGitHub } from '../context/GitHubContext';
import { useAgents } from './useAgents';
import { buildSearchItems, createSearchEngine, type SearchItem } from '../lib/searchIndex';
import { log } from '../lib/logger';

type RecentSearch = { term: string; timestamp: number };

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const navigate = useNavigate();
  const { sessions, getActiveSessions, registerSession } = useSessionContext();
  const { repos, prs, branches } = useGitHub();
  const { agents } = useAgents();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.api) return;
    window.api.search.getRecent().then(setRecentSearches).catch(err =>
      log.error('command-palette', 'Failed to load recent searches', err)
    );
  }, []);

  useEffect(() => {
    if (!window.api) return;
    const unsubscribe = window.api.onShortcut((action: string) => {
      if (action === 'openCommandPalette') {
        setIsOpen(prev => !prev);
      }
    });
    return unsubscribe;
  }, []);

  const searchItems = useMemo(() => {
    return buildSearchItems({
      runningSessions: getActiveSessions(),
      availableAgents: agents,
      repos,
      prs,
      branches,
    });
  }, [sessions, agents, repos, prs, branches, getActiveSessions]);

  const fuse = useMemo(() => createSearchEngine(searchItems), [searchItems]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 20).map(r => r.item);
  }, [fuse, query]);

  const quickActions = useMemo((): SearchItem[] => [
    { id: 'action-settings', type: 'action', title: 'Open Settings', description: 'Ctrl+,', icon: 'settings', iconColor: '$text-muted', route: '/settings' },
    { id: 'action-terminal', type: 'action', title: 'Switch to Terminal', description: 'Ctrl+2', icon: 'terminal', iconColor: '$text-muted', route: '/terminal' },
    { id: 'action-add-agent', type: 'action', title: 'Add Agent', description: 'Ctrl+L', icon: 'plus', iconColor: '$text-muted', route: '/settings/agents' },
  ], []);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const saveRecent = useCallback(async (term: string) => {
    if (!window.api || !term.trim()) return;
    try {
      await window.api.search.addRecent(term.trim());
      const updated = await window.api.search.getRecent();
      setRecentSearches(updated);
    } catch (err) {
      log.error('command-palette', 'Failed to save recent search', err);
    }
  }, []);

  const selectItem = useCallback((item: SearchItem) => {
    if (query.trim()) {
      void saveRecent(query.trim());
    }
    setIsOpen(false);
    setQuery('');

    if (item.route) {
      navigate(item.route);
    } else if (item.action?.startsWith('launch:')) {
      const agentId = item.action.split(':')[1];
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;
      window.api.session.create(agentId, agent.cwd)
        .then(result => {
          if ('error' in result) {
            log.error('command-palette', `Failed to launch ${agentId}`, result.error);
            return;
          }
          registerSession(agentId, result.pid, agent.cwd);
          navigate(`/agent/${agentId}`);
        })
        .catch(err => log.error('command-palette', `Failed to launch ${agentId}`, err));
    }
  }, [navigate, query, saveRecent, agents, registerSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allItems = query.trim() ? results : recentSearches.length > 0 ? [] : quickActions;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(allItems.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) {
          selectItem(allItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  }, [query, results, recentSearches, quickActions, selectedIndex, selectItem]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return {
    isOpen,
    query,
    setQuery,
    selectedIndex,
    results,
    recentSearches,
    quickActions,
    inputRef,
    handleKeyDown,
    selectItem,
    open,
    close,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useCommandPalette.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useCommandPalette.ts renderer/src/hooks/useCommandPalette.test.ts
git commit -m "feat(hook): add useCommandPalette with search, keyboard nav, agent launch"
```

---

## Task 8: CommandPalette Component

**Files:**
- Create: `renderer/src/components/CommandPalette.tsx`
- Test: `renderer/src/components/CommandPalette.test.tsx`

**Interfaces:**
- Consumes: `useCommandPalette` from Task 7
- Produces: `<CommandPalette />` component

- [ ] **Step 1: Write failing test for component rendering**

Create `renderer/src/components/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';

vi.mock('../hooks/useCommandPalette', () => ({
  useCommandPalette: () => ({
    isOpen: true,
    query: '',
    setQuery: vi.fn(),
    selectedIndex: 0,
    results: [],
    recentSearches: [{ term: 'claude-code', timestamp: Date.now() }],
    quickActions: [
      { id: 'action-settings', type: 'action', title: 'Open Settings', description: 'Ctrl+,', icon: 'settings', iconColor: '$text-muted', route: '/settings' },
    ],
    inputRef: { current: null },
    handleKeyDown: vi.fn(),
    selectItem: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('CommandPalette', () => {
  it('renders when open', () => {
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText(/search agents/i)).toBeDefined();
  });

  it('shows recent searches when query is empty', () => {
    render(<CommandPalette />);
    expect(screen.getByText('RECENT')).toBeDefined();
    expect(screen.getByText('claude-code')).toBeDefined();
  });

  it('shows quick actions', () => {
    render(<CommandPalette />);
    expect(screen.getByText('QUICK ACTIONS')).toBeDefined();
    expect(screen.getByText('Open Settings')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/CommandPalette.test.tsx`
Expected: FAIL — `Cannot find module './CommandPalette'`

- [ ] **Step 3: Implement CommandPalette.tsx**

Create `renderer/src/components/CommandPalette.tsx`:

```tsx
import { createPortal } from 'react-dom';
import { Search, History, Settings, Terminal, Plus, CornerDownLeft, SearchX } from 'lucide-react';
import { useCommandPalette } from '../hooks/useCommandPalette';
import type { SearchItem } from '../lib/searchIndex';

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  history: History,
  settings: Settings,
  terminal: Terminal,
  plus: Plus,
  'search-x': SearchX,
  'corner-down-left': CornerDownLeft,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Search;
}

function ResultItem({ item, isSelected, onClick }: { item: SearchItem; isSelected: boolean; onClick: () => void }) {
  const Icon = getIcon(item.icon);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 h-11 px-4 cursor-pointer"
      style={{
        background: isSelected ? 'var(--state-hover)' : 'transparent',
        border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid transparent',
        borderRadius: isSelected ? '6px' : '0',
      }}
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Icon size={14} style={{ color: `var(${item.iconColor.replace('$', '')})` }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.description}</span>
      </div>
      {isSelected && <CornerDownLeft size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />}
    </div>
  );
}

export function CommandPalette() {
  const {
    isOpen, query, setQuery, selectedIndex, results,
    recentSearches, quickActions, inputRef,
    handleKeyDown, selectItem, close,
  } = useCommandPalette();

  if (!isOpen) return null;

  const allItems = query.trim() ? results : [];
  const showRecent = !query.trim() && recentSearches.length > 0;
  const showEmpty = !query.trim() && recentSearches.length === 0;
  const showNoResults = query.trim() && results.length === 0;

  const palette = (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      style={{ paddingTop: 120, background: '#00000080' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-[640px] rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card)', border: '2px solid var(--accent-indigo)', maxHeight: 500 }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 h-14 px-4">
          <Search size={20} style={{ color: query ? 'var(--accent-indigo)' : 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agents, repos, PRs, files..."
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
          />
          <div className="h-6 px-1.5 rounded flex items-center" style={{ background: 'var(--bg)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Ctrl+K</span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'var(--border)' }} />

        {/* Results / Recent / Empty */}
        <div className="flex flex-col overflow-y-auto py-2">
          {showRecent && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>RECENT</span>
              </div>
              {recentSearches.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-3 h-9 px-4 cursor-pointer"
                  onClick={() => setQuery(r.term)}>
                  <History size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.term}</span>
                </div>
              ))}
              <div className="h-px mx-4" style={{ background: 'var(--border)' }} />
            </>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <Search size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Start typing to search</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Search across agents, repos, PRs, branches, and files</span>
            </div>
          )}

          {query.trim() && allItems.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  RESULTS · ↑↓ navigate · ↵ select
                </span>
              </div>
              {allItems.map((item, i) => (
                <ResultItem key={item.id} item={item} isSelected={i === selectedIndex} onClick={() => selectItem(item)} />
              ))}
            </>
          )}

          {showNoResults && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <SearchX size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>No results found</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                No agents, repos, or files match &ldquo;{query}&rdquo;
              </span>
            </div>
          )}

          {/* Quick Actions */}
          {!query.trim() && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>QUICK ACTIONS</span>
              </div>
              {quickActions.map(item => (
                <div key={item.id} className="flex items-center gap-3 h-9 px-4 cursor-pointer"
                  onClick={() => selectItem(item)}>
                  {(() => { const Icon = getIcon(item.icon); return <Icon size={14} style={{ color: 'var(--text-muted)' }} />; })()}
                  <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.description}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {query.trim() && allItems.length > 0 && (
          <>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-4 h-8 px-4">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {selectedIndex + 1} of {allItems.length}
              </span>
              <div className="flex-1" />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>↑↓ nav</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>↵ open</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>esc close</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/CommandPalette.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/CommandPalette.tsx renderer/src/components/CommandPalette.test.tsx
git commit -m "feat(ui): add CommandPalette component with portal, focus trap, 5 states"
```

---

## Task 9: App Integration

**Files:**
- Modify: `renderer/src/App.tsx`

- [ ] **Step 1: Add CommandPalette to App.tsx**

Edit `renderer/src/App.tsx`, add import:

```typescript
import { CommandPalette } from './components/CommandPalette';
```

Add `<CommandPalette />` after `<Toaster />` inside the return:

```tsx
<Toaster />
<CommandPalette />
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat(app): render CommandPalette at root level"
```

---

## Task 10: Settings UI Update

**Files:**
- Modify: `renderer/src/components/settings/KeyboardShortcutsSettings.tsx`

- [ ] **Step 1: Add Command Palette row to NAVIGATION section**

Edit `renderer/src/components/settings/KeyboardShortcutsSettings.tsx`, add inside the NAVIGATION `SectionCard`, before the existing rows:

```tsx
<SettingsRow label="Command Palette">
  <ShortcutKeys accel={navigation.openCommandPalette} />
</SettingsRow>
<RowSeparator />
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/KeyboardShortcutsSettings.tsx
git commit -m "feat(settings): add Command Palette shortcut to keyboard settings"
```

---

## Task 11: Smoke Test

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify Ctrl+K opens palette**

Press `Ctrl+K` — palette should appear centered with search input focused.

- [ ] **Step 3: Verify search works**

Type "claude" — should show results if agents are configured, or "No results found" if not.

- [ ] **Step 4: Verify keyboard navigation**

Press `↓` — first result should highlight with indigo border. Press `Enter` — should navigate.

- [ ] **Step 5: Verify Escape closes**

Press `Esc` — palette should close.

- [ ] **Step 6: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: command palette complete — Ctrl+K navigation across all surfaces"
```