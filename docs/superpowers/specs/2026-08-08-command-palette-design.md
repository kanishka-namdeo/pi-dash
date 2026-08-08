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

## Architecture

### Component Structure

```
CommandPalette (modal overlay, focus trap)
├── SearchInput
│   ├── SearchIcon (lucide)
│   ├── Controlled <input> with auto-focus
│   ├── Cursor (blinking when active)
│   └── ShortcutBadge ("Ctrl+K")
├── ResultsSection
│   ├── SectionHeader ("RESULTS" / "RECENT" / "QUICK ACTIONS")
│   └── ResultItem[] (icon + title + description)
├── EmptyState (no results / initial state)
│   ├── Icon
│   ├── Title
│   └── Description
└── Footer (keyboard navigation hints)
    ├── Position indicator ("2 of 4")
    └── Shortcut hints ("↑↓ nav", "↵ open", "esc close")
```

### Data Sources

| Source | What it provides | Index fields |
|---|---|---|
| `SessionContext` | Running agents | `name`, `cwd`, `state` |
| `GitHubContext` | Repos, PRs, branches, issues | `repo.name`, `pr.title`, `pr.number`, `branch.name` |
| `useAgents()` | Available agents | `name`, `path` |
| Static routes | App surfaces | Hardcoded: Dashboard, Terminal, Settings, Worktrees |
| Quick actions | Keyboard shortcuts | From `settings.keyboard` |

### Search Index

```typescript
type SearchItem = {
  id: string;
  type: 'agent' | 'repo' | 'pr' | 'branch' | 'file' | 'route' | 'action';
  title: string;
  description: string;
  icon: string;          // lucide icon name
  iconColor: string;     // design token reference
  action: () => void;    // navigation callback
  keywords?: string[];   // additional search terms
};
```

**Fuse.js config:** threshold 0.3, keys: `['title', 'description', 'keywords']`

## UI Variants

Five variants defined in `design/pidash-ui.pen` → "Command Palette Flow":

### Variant 1: Default State

**When:** Palette just opened, no search text entered.

**Structure:**
- Search input with placeholder "Search agents, repos, PRs, files..."
- Cursor badge showing "Ctrl+K"
- **RECENT** section: last 3 search terms with clock icons
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

**Visual:**
- 32px vertical padding around empty state
- Icon box: 48px, $bg fill, 12px radius

### Variant 4: Keyboard Navigation

**When:** User pressed arrow keys to highlight a result.

**Structure:**
- Same as Variant 2 (active search with results)
- First result highlighted:
  - $state-hover fill
  - 1px $accent-indigo stroke, 6px radius
  - corner-down-left icon on right side (enter action indicator)
- Section header shows navigation hints: "RESULTS · ↑↓ navigate · ↵ select"
- Footer bar:
  - Left: "2 of 4" (position indicator)
  - Right: "↑↓ nav", "↵ open", "esc close" (shortcut hints)

**Visual:**
- Footer: 32px height, $border top divider
- All text in footer: 11px $font-mono, $text-muted
- Highlighted item has visible border to distinguish from hover

### Variant 5: Empty State (No Data)

**When:** No recent searches AND no data sources connected (fresh install).

**Structure:**
- Search input with placeholder (no cursor)
- Empty state:
  - search icon (48px box)
  - "Start typing to search" title
  - "Search across agents, repos, PRs, branches, and files" description
- Divider
- **QUICK ACTIONS** section still visible:
  - Open Settings (Ctrl+,)
  - Switch to Terminal (Ctrl+2)
  - Add Agent (Ctrl+L)

**Visual:**
- Same empty state styling as Variant 3
- Quick actions always available regardless of data state

## Keyboard Interaction

| Key | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Open palette, focus input |
| `Escape` | Close palette |
| `↑` / `↓` | Navigate results (wraps at boundaries) |
| `Enter` | Select highlighted item |
| `Tab` | (future) Cycle through result groups |

## Implementation Notes

### New Files
- `renderer/src/components/CommandPalette.tsx` — main component
- `renderer/src/hooks/useCommandPalette.ts` — open/close state, keyboard handling
- `renderer/src/lib/searchIndex.ts` — fuse.js wrapper, index builder

### Modified Files
- `src/main/settings/settings-types.ts` — add `openCommandPalette: 'Ctrl+K'` to `keyboard.navigation`
- `src/main/settings/settings-defaults.ts` — add default
- `src/main/keyboard/keyboard-shortcut-manager.ts` — register shortcut, forward to renderer
- `renderer/src/App.tsx` — render `<CommandPalette />` at root level (outside routes)
- `renderer/src/components/settings/KeyboardShortcutsSettings.tsx` — show new shortcut

### Dependencies
- `fuse.js` (~10KB gzipped) — fuzzy search. Already common in Electron apps.

### Focus Management
- Palette uses React portal to render at document root
- Focus trap: Tab/Shift+Tab cycle within palette
- Auto-focus input on open
- Restore focus to previous element on close

### Performance
- Search index rebuilt on context changes (debounced 100ms)
- Fuse.js search is O(n) but n < 100 items typically — sub-millisecond
- Recent searches: max 10, LRU eviction

## Acceptance Criteria

1. `Ctrl+K` opens palette from any route
2. Typing filters results across all data sources
3. Arrow keys navigate results, Enter selects
4. Escape closes palette
5. Recent searches persist across app restarts
6. No results shows appropriate empty state
7. Quick actions always visible and functional
8. Focus trap prevents tabbing to background
9. Palette renders above all other content (z-index)
10. Works on Windows (Ctrl+K) and Mac (Cmd+K)
