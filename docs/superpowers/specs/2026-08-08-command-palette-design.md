# Command Palette Design Spec

**Date:** 2026-08-08  
**Status:** Draft — pending user approval  
**Design file:** `design/pidash-ui.pen` → "Command Palette Flow" frame

## Overview

A `Ctrl+K` command palette for PiDash providing instant navigation to any surface — agents, repos, PRs, branches, files, settings, and routes. Modal overlay centered on screen with fuzzy search, recent searches, and quick actions.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Trigger | `Ctrl+K` / `Cmd+K` | Standard command palette shortcut (VS Code, Linear, Notion) |
| Position | Centered modal overlay | Doesn't disrupt current view, works from any route |
| Search | Fuzzy matching via fuse.js | Tolerant of typos, fast on small datasets |
| Results | Grouped by type | Agents, repos, PRs, branches, files, routes |
| History | Recent searches persisted | LRU, max 10, stored in electron-store |
| Navigation | Full keyboard support | Arrow keys, Enter, Escape — mouse optional |

---

## Layer 1: Main Process

### Settings Schema Extension

**File:** `src/main/settings/settings-types.ts`

Add `openCommandPalette` to `keyboard.navigation`:

```typescript
keyboard: {
  // ... existing
  navigation: {
    dashboardView: string;
    terminalView: string;
    toggleSidebar: string;
    openCommandPalette: string;  // NEW
  };
};
```

**File:** `src/main/settings/settings-defaults.ts`

```typescript
navigation: {
  // ... existing
  openCommandPalette: isWindows ? 'Ctrl+K' : 'Command+K',
};
```

### Keyboard Shortcut Registration

**File:** `src/main/keyboard/keyboard-shortcut-manager.ts`

Add registration in `register()`:

```typescript
this.registerShortcut(kb.navigation.openCommandPalette, 'openCommandPalette');
```

Add case in `handleAction()`:

```typescript
case 'openCommandPalette':
  win.webContents.send('shortcut', 'openCommandPalette');
  break;
```

This follows the existing pattern — the shortcut is forwarded to the renderer via the `shortcut` IPC channel, where the `useCommandPalette` hook listens for it.

### Recent Searches Persistence

**File:** `src/main/ipc/search-handlers.ts` (NEW)

```typescript
import { ipcMain } from 'electron';
import type { SettingsService } from '../settings/settings-service';

// Recent searches stored under 'search.recent' in electron-store
// Schema: Array<{ term: string; timestamp: number }>
// Max 10 items, LRU eviction

export function registerSearchHandlers(settingsService: SettingsService): void {
  ipcMain.handle('search:getRecent', () => {
    const recent = settingsService.get('search.recent') as Array<{ term: string; timestamp: number }> | undefined;
    return recent || [];
  });

  ipcMain.handle('search:addRecent', (_event, term: string) => {
    const recent = (settingsService.get('search.recent') as Array<{ term: string; timestamp: number }>) || [];
    const filtered = recent.filter(r => r.term !== term); // deduplicate
    filtered.unshift({ term, timestamp: Date.now() });
    const trimmed = filtered.slice(0, 10); // LRU cap
    settingsService.set('search.recent', trimmed);
    return { success: true };
  });

  ipcMain.handle('search:clearRecent', () => {
    settingsService.set('search.recent', []);
    return { success: true };
  });
}
```

**File:** `src/main/settings/settings-types.ts` — add `search` section:

```typescript
search: {
  recent: Array<{ term: string; timestamp: number }>;
};
```

**File:** `src/main/settings/settings-defaults.ts`:

```typescript
search: {
  recent: [],
},
```

**File:** `src/main.ts` — register handler in `app.whenReady()`:

```typescript
import { registerSearchHandlers } from './main/ipc/search-handlers';
// ... after settingsService is created:
registerSearchHandlers(settingsService);
```

---

## Layer 2: Preload Bridge

**File:** `src/preload.ts`

Add search API to the `contextBridge.exposeInMainWorld` call:

```typescript
search: {
  getRecent: () => ipcRenderer.invoke('search:getRecent'),
  addRecent: (term: string) => ipcRenderer.invoke('search:addRecent', term),
  clearRecent: () => ipcRenderer.invoke('search:clearRecent'),
},
```

**File:** `renderer/src/types/global.d.ts`

Add to `window.api` interface:

```typescript
search: {
  getRecent: () => Promise<Array<{ term: string; timestamp: number }>>;
  addRecent: (term: string) => Promise<{ success: true }>;
  clearRecent: () => Promise<{ success: true }>;
},
```

---

## Layer 3: Renderer — Search Index

**File:** `renderer/src/lib/searchIndex.ts` (NEW)

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
  icon: string;        // lucide icon name
  iconColor: string;   // CSS variable reference e.g. '$accent-amber'
  route?: string;      // react-router path for navigation
  action?: string;     // action identifier for quick actions
  keywords?: string[]; // additional search terms
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

  // Running agents
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

  // Available agents
  for (const agent of config.availableAgents) {
    const isRunning = config.runningSessions.some(s => s.agentId === agent.id);
    if (isRunning) continue; // skip duplicates
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

  // Repos
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

  // PRs
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

  // Branches
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

  // Static routes
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

**Dependency:** `pnpm add fuse.js` (~10KB gzipped)

---

## Layer 4: Renderer — Hook

**File:** `renderer/src/hooks/useCommandPalette.ts` (NEW)

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

  // Load recent searches on mount
  useEffect(() => {
    if (!window.api) return;
    window.api.search.getRecent().then(setRecentSearches).catch(err =>
      log.error('command-palette', 'Failed to load recent searches', err)
    );
  }, []);

  // Listen for Ctrl+K shortcut from main process
  useEffect(() => {
    if (!window.api) return;
    const unsubscribe = window.api.onShortcut((action: string) => {
      if (action === 'openCommandPalette') {
        setIsOpen(prev => !prev);
      }
    });
    return unsubscribe;
  }, []);

  // Build search index from current context data
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

  // Filtered results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 20).map(r => r.item);
  }, [fuse, query]);

  // Quick actions (always available)
  const quickActions = useMemo((): SearchItem[] => [
    { id: 'action-settings', type: 'action', title: 'Open Settings', description: 'Ctrl+,', icon: 'settings', iconColor: '$text-muted', route: '/settings' },
    { id: 'action-terminal', type: 'action', title: 'Switch to Terminal', description: 'Ctrl+2', icon: 'terminal', iconColor: '$text-muted', route: '/terminal' },
    { id: 'action-add-agent', type: 'action', title: 'Add Agent', description: 'Ctrl+L', icon: 'plus', iconColor: '$text-muted', route: '/settings/agents' },
  ], []);

  // Reset selection when results change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Save search term to recent when an item is selected
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

  // Navigate to selected item
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

  // Keyboard handlers
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

  // Open/close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    // Focus input after render
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

---

## Layer 5: Renderer — Component

**File:** `renderer/src/components/CommandPalette.tsx` (NEW)

Renders the modal overlay and delegates to the hook. Structure matches the 5 design variants:

```
CommandPalette
├── Backdrop (click to close, #00000080)
└── PaletteCard (640px, $card, 12px radius, 2px $accent-indigo stroke)
    ├── SearchInput
    │   ├── SearchIcon (lucide, $text-muted or $accent-indigo when typing)
    │   ├── <input> (auto-focused, controlled)
    │   └── ShortcutBadge ("Ctrl+K")
    ├── [when query empty] RecentSection
    │   ├── "RECENT" header
    │   └── RecentItem[] (clock icon + term)
    ├── [when query has results] ResultsSection
    │   ├── "RESULTS · ↑↓ navigate · ↵ select" header
    │   └── ResultItem[] (icon box + title + description)
    ├── [when query has no results] EmptyState
    │   ├── search-x icon
    │   ├── "No results found"
    │   └── 'No agents, repos, or files match "{query}"'
    ├── [when query empty + no recent] EmptyState
    │   ├── search icon
    │   ├── "Start typing to search"
    │   └── "Search across agents, repos, PRs, branches, and files"
    ├── QuickActionsSection (always visible when query empty)
    │   ├── "QUICK ACTIONS" header
    │   └── ActionItem[] (icon + label + shortcut)
    └── [when navigating] Footer
        ├── Position ("1 of 4")
        └── Hints ("↑↓ nav", "↵ open", "esc close")
```

**Key implementation details:**
- Rendered via React portal at `document.body` for z-index isolation
- Focus trap: Tab/Shift+Tab cycle within palette
- Backdrop click closes palette
- `Esc` closes palette
- Input auto-focused on open via `requestAnimationFrame`

---

## Layer 6: Renderer — App Integration

**File:** `renderer/src/App.tsx`

Add `<CommandPalette />` at the root level, outside `<Routes>`:

```typescript
import { CommandPalette } from './components/CommandPalette';

// Inside the return, after <Toaster />:
<CommandPalette />
```

This ensures the palette is available on every route.

---

## Layer 7: Settings UI

**File:** `renderer/src/components/settings/KeyboardShortcutsSettings.tsx`

Add a row in the NAVIGATION section:

```typescript
<SettingsRow label="Command Palette">
  <ShortcutKeys accel={navigation.openCommandPalette} />
</SettingsRow>
<RowSeparator />
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process                                                 │
│                                                              │
│  KeyboardShortcutManager                                     │
│    └── Ctrl+K → win.webContents.send('shortcut',            │
│                    'openCommandPalette')                      │
│                                                              │
│  SearchHandlers (IPC)                                        │
│    ├── search:getRecent → electron-store 'search.recent'    │
│    ├── search:addRecent → electron-store (LRU, max 10)     │
│    └── search:clearRecent → electron-store []               │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC
┌──────────────────────────▼──────────────────────────────────┐
│ Preload (contextBridge)                                      │
│  window.api.onShortcut(callback)                             │
│  window.api.search.getRecent()                               │
│  window.api.search.addRecent(term)                           │
│  window.api.search.clearRecent()                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Renderer                                                     │
│                                                              │
│  useCommandPalette() hook                                    │
│    ├── Listens for 'openCommandPalette' shortcut             │
│    ├── Reads SessionContext → running agents                 │
│    ├── Reads GitHubContext → repos, PRs, branches           │
│    ├── Reads useAgents() → available agents                  │
│    ├── buildSearchItems() → SearchItem[]                     │
│    ├── createSearchEngine() → Fuse<SearchItem>              │
│    ├── fuse.search(query) → filtered results                 │
│    └── selectItem() → navigate(route) + saveRecent(term)    │
│                                                              │
│  <CommandPalette /> component                                │
│    ├── Portal to document.body                               │
│    ├── Focus trap                                            │
│    ├── Keyboard navigation (↑↓ Enter Esc)                  │
│    └── 5 visual states (matches design variants)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `window.api` undefined (browser env) | Palette opens but shows only static routes + quick actions |
| Recent searches IPC fails | Logged via `log.error`, palette shows empty recent section |
| GitHub context empty (not authenticated) | No repo/PR/branch items in index; agents + routes still work |
| No agents configured | No agent items; routes + quick actions still available |
| Fuse.js returns 0 results | Variant 3 (No Results) empty state shown |
| Navigation target route doesn't exist | react-router handles 404; palette still closes |

---

## UI Variants

Five variants defined in `design/pidash-ui.pen` → "Command Palette Flow":

### Variant 1: Default State

**When:** Palette just opened, no search text entered.

**Structure:**
- Search input with placeholder "Search agents, repos, PRs, files..."
- Cursor badge showing "Ctrl+K"
- **RECENT** section: last 3 search terms with history icons
- Divider
- **QUICK ACTIONS** section: Settings (Ctrl+,), Terminal (Ctrl+2)

**Visual:**
- Modal: 640px wide, $card fill, 12px radius, 2px $accent-indigo stroke
- Overlay: #00000080 backdrop
- Items: 36px height, 14px icons, 13px text

### Variant 2: Active Search

**When:** User has typed search text (e.g., "claude").

**Structure:**
- Search input shows typed text with blinking cursor
- Search icon turns $accent-indigo (active state)
- **RESULTS** section with grouped matches:
  - Agent: bot icon (amber) — "claude-code · Running · 2h active"
  - Agent: bot icon (emerald) — "claude-agent · Available"
  - Branch: git-branch icon (blue) — "claude-integration branch"
  - File: file-text icon — "claude.config.json · Modified"

**Visual:**
- Results: 44px height per item
- Icon boxes: 28px, $bg fill, 6px radius
- Title: 13px $text-primary, Description: 11px $text-muted

### Variant 3: No Results

**When:** Search text has no matches.

**Structure:**
- Search input with typed text
- Empty state centered in palette:
  - search-x icon (48px box, $text-muted)
  - "No results found" title (15px, semibold)
  - Description: 'No agents, repos, or files match "xyznotfound"' (13px, muted)

### Variant 4: Keyboard Navigation

**When:** User pressed arrow keys to highlight a result.

**Structure:**
- Same as Variant 2 (active search with results)
- First result highlighted:
  - $state-hover fill
  - 1px $accent-indigo stroke, 6px radius
  - corner-down-left icon on right side (enter action indicator)
- Section header: "RESULTS · ↑↓ navigate · ↵ select"
- Footer bar: "1 of 4" | "↑↓ nav" | "↵ open" | "esc close"

### Variant 5: Empty State (No Data)

**When:** No recent searches AND no data sources connected (fresh install).

**Structure:**
- Search input with placeholder (no cursor)
- Empty state: "Start typing to search"
- Quick Actions always visible: Settings, Terminal, Add Agent

---

## Keyboard Interaction

| Key | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Toggle palette open/closed, focus input |
| `Escape` | Close palette, clear query |
| `↑` / `↓` | Navigate results (wraps at boundaries) |
| `Enter` | Select highlighted item, navigate, save to recent |
| Click backdrop | Close palette |
| Click result item | Select and navigate |

---

## File Summary

### New Files (6)
| File | Layer | Purpose |
|---|---|---|
| `src/main/ipc/search-handlers.ts` | Main | IPC handlers for recent searches persistence |
| `renderer/src/lib/searchIndex.ts` | Renderer | Search item builder + Fuse.js engine |
| `renderer/src/hooks/useCommandPalette.ts` | Renderer | State, keyboard, navigation logic |
| `renderer/src/components/CommandPalette.tsx` | Renderer | UI component (portal, focus trap, 5 states) |

### Modified Files (7)
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

## Acceptance Criteria

1. `Ctrl+K` opens palette from any route
2. `Cmd+K` works on macOS
3. Typing filters results across all data sources (agents, repos, PRs, branches, routes)
4. Arrow keys navigate results, Enter selects and navigates
5. Escape closes palette
6. Click backdrop closes palette
7. Recent searches persist across app restarts (electron-store)
8. Recent searches show when palette opens with empty query
9. No results shows appropriate empty state (Variant 3)
10. Quick actions always visible when query is empty
11. Focus trap prevents tabbing to background
12. Palette renders above all other content (portal at document.body)
13. Search icon changes color when typing ($text-muted → $accent-indigo)
14. Keyboard shortcut is customizable in Settings → Keyboard Shortcuts
15. Works when GitHub is not authenticated (shows agents + routes only)
16. Works when no agents are configured (shows routes + quick actions only)
17. No `console.log` — uses `log` from `@/lib/logger` throughout
