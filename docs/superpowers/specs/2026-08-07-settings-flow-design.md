# Settings Flow Design Spec

**Date:** 2026-08-07  
**Status:** Approved  
**Design Source:** `design/pidash-ui.pen` (Node ID: `tBLxz`)

## Overview

Implement a full-featured Settings screen for PiDash with 9 configuration panels, persistent storage via electron-store, functional keyboard shortcuts, and OS-level notifications.

## Architecture

### Data Flow

```
Main Process                              Renderer
─────────────                             ─────────
SettingsService                           useSettings() hook
  ├─ electron-store instance                ├─ reads all settings on mount
  ├─ typed schema with defaults             ├─ subscribe to changes via IPC event
  ├─ get(path) / set(path, value)           └─ calls settings:set via preload
  └─ export() / import() / reset()      
                                       SettingsContext
IPC: settings:get / settings:set             ├─ provides settings + update fn
     settings:getAll / settings:reset        └─ wraps /settings route
     settings:export / settings:import
     settings:change (event → renderer)  
                                       SettingsScreen (/settings route)
KeyboardShortcutManager                       ├─ SettingsSidebar (nav)
  ├─ register/unregister accelerators         └─ Content panel (switch on activeTab)
  └─ reads from settings.keyboard            └─ 9 panel components

NotificationManager
  ├─ subscribes to agent + GitHub events
  └─ fires Electron Notification API
      based on settings.notifications
```

### Storage

- **Library:** `electron-store` (JSON file in user data directory)
- **Instance:** Single store for all settings
- **Schema:** Typed `SettingsSchema` interface with defaults
- **File location:** `{userData}/config.json` (managed by electron-store)

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `settings:getAll` | renderer → main | Fetch all settings on mount |
| `settings:set` | renderer → main | Update a single setting by path |
| `settings:reset` | renderer → main | Reset all settings to defaults |
| `settings:export` | renderer → main | Serialize settings to JSON file |
| `settings:import` | renderer → main | Load settings from JSON file |
| `settings:change` | main → renderer | Broadcast setting changes to all listeners |

## Settings Schema

```typescript
interface SettingsSchema {
  general: {
    theme: 'dark' | 'light' | 'system';        // default: 'dark'
    language: string;                            // default: 'en'
    fontSize: 'small' | 'medium' | 'large';     // default: 'medium'
    launchOnBoot: boolean;                       // default: false
    restoreSession: boolean;                     // default: true
    minimizeToTray: boolean;                     // default: false
    defaultWorkingDirectory: string;             // default: '~/projects'
    autoDetectOnLaunch: boolean;                 // default: true
    maxConcurrentAgents: number;                 // default: 8
  };

  agents: {
    // Agents are stored separately in agent-store.ts (existing)
    // This section holds agent-related preferences only
  };

  github: {
    authMethod: 'pat' | 'oauth';                // default: 'pat'
    autoCreateWorktree: boolean;                 // default: false
    defaultPRTemplate: string;                   // default: 'default'
    autoLinkCommits: boolean;                    // default: true
  };

  notifications: {
    // Agent events
    agentStarted: boolean;                       // default: true
    agentCompleted: boolean;                     // default: true
    agentError: boolean;                         // default: true
    // GitHub events
    prReviewRequested: boolean;                  // default: true
    issueAssigned: boolean;                      // default: true
    prMerged: boolean;                           // default: false
    // Style
    desktop: boolean;                            // default: true
    sound: boolean;                              // default: false
    badgeCount: boolean;                         // default: true
  };

  keyboard: {
    general: {
      openSettings: string;                      // default: 'Ctrl+,'
      togglePiP: string;                         // default: 'Ctrl+Shift+P'
      closeWindow: string;                       // default: 'Ctrl+W'
      quitApp: string;                           // default: 'Ctrl+Q'
    };
    agents: {
      launchAgent: string;                       // default: 'Ctrl+L'
      stopAgent: string;                         // default: 'Ctrl+Shift+X'
      nextAgent: string;                         // default: 'Ctrl+]'
      previousAgent: string;                     // default: 'Ctrl+Shift+['
    };
    navigation: {
      dashboardView: string;                     // default: 'Ctrl+1'
      terminalView: string;                      // default: 'Ctrl+2'
      toggleSidebar: string;                     // default: 'Ctrl+B'
    };
  };

  terminal: {
    defaultShell: string;                        // default: platform-dependent
    shellArgs: string;                           // default: '--login'
    fontFamily: string;                          // default: 'Geist Mono'
    fontSize: number;                            // default: 14
    theme: string;                               // default: 'dark'
    scrollbackLines: number;                     // default: 10000
    cursorStyle: 'block' | 'underline' | 'bar'; // default: 'block'
    copyOnSelect: boolean;                       // default: false
  };

  worktrees: {
    directory: string;                           // default: '~/.pidash/worktrees'
    autoCleanup: boolean;                        // default: false
    branchNamingPattern: string;                 // default: 'issue-{number}'
    maxConcurrent: number;                       // default: 10
  };

  advanced: {
    developerMode: boolean;                      // default: false
    logLevel: 'error' | 'warn' | 'info' | 'debug'; // default: 'info'
  };
}
```

**Notes:**
- `agents` section is empty because agent configs already live in `agent-store.ts`
- Platform-dependent defaults (like `defaultShell`) are resolved at runtime: PowerShell on Windows, bash on macOS/Linux
- Keyboard shortcuts stored as Electron accelerator strings
- `fontSize` in `general` is UI scaling (small/medium/large), `terminal.fontSize` is the actual pixel size for xterm

## Component Structure

```
SettingsScreen (/settings route)
├── SettingsSidebar
│   ├── SectionLabel "SETTINGS"
│   ├── NavItem (9x) — icon + label, active state with indigo fill
│   ├── Separator
│   └── VersionLabel "PiDash v1.2.0"
│
└── ContentPanel (switch on activeTab)
    ├── GeneralSettings
    │   ├── SectionCard "Appearance" — Theme, Language, Font Size (dropdowns)
    │   ├── SectionCard "Startup" — Launch on boot, Restore session, Minimize to tray (toggles)
    │   └── SectionCard "Agents" — Default dir, Auto-detect, Max concurrent (dropdown + toggle + dropdown)
    │
    ├── AgentsSettings
    │   ├── SectionCard "Configured Agents" — list of AgentRow (avatar, name, path, status, remove btn)
    │   └── AddAgentButton
    │
    ├── GitHubSettings (replaces existing GitHubSettings.tsx)
    │   ├── SectionCard "Authentication" — Auth method (dropdown), Token status (badge)
    │   ├── SectionCard "Repositories" — (existing repo management, restructured into card)
    │   └── SectionCard "Pull Requests & Issues" — Auto-create worktree, PR template, Auto-link commits
    │
    ├── NotificationsSettings
    │   ├── SectionCard "Agent Events" — started, completed, error (toggles)
    │   ├── SectionCard "GitHub Events" — PR review, issue assigned, PR merged (toggles)
    │   └── SectionCard "Notification Style" — Desktop, Sound, Badge count (toggles)
    │
    ├── KeyboardShortcutsSettings
    │   ├── SectionCard "General" — Open Settings, Toggle PiP, Close Window, Quit (keycaps)
    │   ├── SectionCard "Agents" — Launch, Stop, Next, Previous (keycaps)
    │   └── SectionCard "Navigation" — Dashboard, Terminal, Toggle Sidebar (keycaps)
    │
    ├── TerminalSettings
    │   ├── SectionCard "Shell" — Default shell (dropdown), Shell args (input)
    │   ├── SectionCard "Appearance" — Font family, Font size, Theme (dropdowns)
    │   └── SectionCard "Behavior" — Scrollback, Cursor style, Copy on select (dropdowns + toggle)
    │
    ├── WorktreesSettings
    │   ├── SectionCard "Location" — Directory path (input + browse button)
    │   └── SectionCard "Behavior" — Auto-cleanup, Branch naming, Max concurrent (toggle + dropdown + dropdown)
    │
    ├── AdvancedSettings
    │   ├── SectionCard "Developer" — Dev mode, Log level, Config file (toggle + dropdown + button)
    │   ├── SectionCard "Data Management" — Export, Import, Cache size (buttons)
    │   └── SectionCard "Danger Zone" — Reset settings, Clear all data (rose-styled buttons)
    │
    └── AboutSettings
        ├── LogoSection — π logo, app name, tagline, version
        ├── SectionCard "Links" — Website, Docs, Source, Report Issue (external links)
        └── CheckUpdatesButton + License text
```

### Shared Components

- **`SectionCard`** — reusable card with title label + rows separated by dividers
- **`SettingsRow`** — label + description on left, control on right (dropdown/toggle/input/button)
- **`KeyCap`** — keyboard key visual (small bg box with border, mono font)
- **`StatusBadge`** — colored dot + text for connection status

### Routing

- `/settings` renders `SettingsScreen`
- Active tab stored in URL search params (`?tab=terminal`) so refresh preserves position
- Default tab is `general`

### Reuse of Existing Components

- `Toggle` (yCZsc in design) → shadcn `Switch` component
- `Select` (rcRli in design) → shadcn `Select` component
- `AgentRow` already exists in `components/ui/AgentRow.tsx` — reuse for Agents settings

## Keyboard Shortcuts

### Main Process: `KeyboardShortcutManager`

- On app start, reads `settings.keyboard` and registers all accelerators via `globalShortcut.register()`
- When settings change, unregisters old shortcuts and re-registers new ones
- Each shortcut maps to an action:
  - `openSettings` → `mainWindow.webContents.send('navigate', '/settings')`
  - `togglePiP` → `mainWindow.webContents.send('pip:toggle')`
  - `closeWindow` → `mainWindow.close()`
  - `quitApp` → `app.quit()`
  - `launchAgent` / `stopAgent` / `nextAgent` / `previousAgent` → sent to renderer for session management
  - `dashboardView` / `terminalView` / `toggleSidebar` → sent to renderer for navigation

### Shortcut Conflicts

- If a user-configured shortcut conflicts with a system or Electron default, show a warning in the UI but allow it (user's choice)
- If two settings shortcuts conflict with each other, prevent saving and highlight the conflict

## Notifications

### Main Process: `NotificationManager`

- Subscribes to agent lifecycle events from `SessionManager` (session:start, session:exit, session:error)
- Subscribes to GitHub events from `GitHubService` data fetching (PR review requested, issue assigned, PR merged)
- On each event, checks `settings.notifications` to determine if a notification should fire
- Uses Electron's `Notification` API:
  ```typescript
  new Notification({
    title: 'Agent completed',
    body: 'Claude Code finished its task',
    icon: agentIcon,
  })
  ```
- Sound: uses `notification.sound` property when `settings.notifications.sound` is true
- Badge count: uses `app.setBadgeCount()` on macOS/Linux when `settings.notifications.badgeCount` is true

### Event Sources

- Agent events: already flow through `SessionManager` → IPC `session:exit` events
- GitHub events: already flow through `GitHubService` data fetching (polling or future webhooks)

## Error Handling & Edge Cases

### Settings Persistence

- electron-store handles file I/O errors internally; if the settings file is corrupted, it falls back to defaults
- Export/import: validate JSON schema before applying — show error toast if invalid
- Reset: confirm dialog before wiping all settings

### Platform Differences

- `defaultShell`: resolve at runtime — PowerShell on Windows, bash/zsh on macOS/Linux
- `launchOnBoot`: uses `app.setLoginItemSettings()` — works on all platforms
- `minimizeToTray`: uses `Tray` API — hide to tray on close instead of quit
- Badge count: `app.setBadgeCount()` is macOS-only; no-op on Windows/Linux (document this in the UI)

### Theme Switching

- `general.theme` with `'system'` option follows OS preference via `nativeTheme.shouldUseDarkMode`
- Changes apply immediately without restart

### Terminal Settings

- `terminal.fontSize` and `terminal.fontFamily` changes apply to new sessions only (existing sessions keep their config)
- `terminal.defaultShell` changes apply to new sessions only

### GitHub Settings

- `github.authMethod` change doesn't affect existing auth — user must re-authenticate if switching methods
- `github.defaultPRTemplate` is stored as a string identifier; actual templates are managed separately

### Worktrees

- `worktrees.directory` browse button uses `dialog.showOpenDialog()` (existing `openDirectory` preload API)
- Path is stored as-is; `~` expansion happens at use time in `WorktreeService`

### Danger Zone

- "Reset all settings" → confirm dialog → `store.clear()` → reload settings → navigate to General
- "Clear all data" → confirm dialog → delete agent store, session store, settings, cache → restart app

## File Structure

### Main Process (new files)

```
src/main/
├── settings/
│   ├── settings-service.ts      # electron-store wrapper, typed schema, defaults
│   ├── settings-types.ts        # SettingsSchema interface
│   └── settings-defaults.ts     # Default values per platform
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
│   └── useSettings.ts           # Fetch settings, subscribe to changes, update via IPC
├── context/
│   └── SettingsContext.tsx       # Provide settings + update fn to tree
├── components/
│   └── settings/
│       ├── SettingsScreen.tsx    # Main settings layout (sidebar + content)
│       ├── SettingsSidebar.tsx   # Navigation sidebar
│       ├── SectionCard.tsx       # Reusable card with title + rows
│       ├── SettingsRow.tsx       # Label + description + control
│       ├── KeyCap.tsx            # Keyboard key visual
│       ├── GeneralSettings.tsx
│       ├── AgentsSettings.tsx
│       ├── GitHubSettings.tsx    # Replaces existing GitHubSettings.tsx
│       ├── NotificationsSettings.tsx
│       ├── KeyboardShortcutsSettings.tsx
│       ├── TerminalSettings.tsx
│       ├── WorktreesSettings.tsx
│       ├── AdvancedSettings.tsx
│       └── AboutSettings.tsx
```

### Modified Files

- `src/preload.ts` — Add `settings` API to preload bridge
- `src/main.ts` — Initialize `SettingsService`, `KeyboardShortcutManager`, `NotificationManager`
- `src/main/ipc-handlers.ts` — Register settings IPC handlers
- `renderer/src/App.tsx` — Add `/settings` route
- `renderer/src/types/global.d.ts` — Add `settings` API to `window.api`
- `package.json` — Add `electron-store` dependency

## Dependencies

- `electron-store` — JSON settings persistence

## Testing Strategy

- **Unit tests:** `settings-service.ts` (get/set/reset/export/import), `keyboard-shortcut-manager.ts` (register/unregister)
- **Integration tests:** IPC handlers (mock electron-store), preload bridge
- **Component tests:** Each settings panel (render with mock settings, verify controls)
- **E2E tests:** Change a setting, verify it persists across app restart

## Out of Scope

- Customizable keyboard shortcuts (click to rebind) — future enhancement
- Settings sync across devices — not needed for local-first app
- Per-agent settings — agents use global terminal settings
- Settings search/filter — not in current design
