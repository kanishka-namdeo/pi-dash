# Settings Wiring Design

**Date:** 2026-08-08
**Status:** Approved
**Scope:** Connect unwired settings to existing behaviors; remove settings with no behavioral target

## Problem

The settings system has full infrastructure (SettingsService, IPC, SettingsContext, UI controls) but ~25 of 40+ settings are stored and editable in the UI without affecting any app behavior. Additionally, the SettingsScreen had a routing bug (nested `<Routes>` with absolute paths inside `/settings/*`) that prevented any tab content from rendering — fixed separately by replacing Routes with conditional rendering on `activeTab`.

## Approach

Wire every unwired setting to the code it already describes. Remove settings whose behavioral target requires building a new system (i18n, event workflows, template infrastructure). No new systems — pure wiring and cleanup.

## Schema Cleanup

### Removed from `SettingsSchema` (12 fields)

| Setting | Reason for removal |
|---------|-------------------|
| `general.language` | No i18n system exists |
| `github.authMethod` | Display-only; doesn't control auth flow |
| `github.autoCreateWorktree` | Needs issue-assignment event system |
| `github.defaultPRTemplate` | Needs template infrastructure |
| `github.autoLinkCommits` | Convention, not enforceable |
| `github.defaultBranch` | Local `useState`, no persisted target |
| `github.autoFetch` | Local `useState`, no polling target |
| `github.fetchInterval` | Local `useState`, no polling target |
| `worktrees.autoCleanup` | Needs PR-merge event workflow |
| `worktrees.maxConcurrent` | Number stored, never enforced |

The entire `github` section is removed from `SettingsSchema`. The GitHub settings tab keeps only the Authentication section (token status + connect/disconnect).

### Files changed

- `src/main/settings/settings-types.ts` — remove fields from interface
- `src/main/settings/settings-defaults.ts` — remove corresponding defaults
- `renderer/src/components/settings/GitHubSettings.tsx` — remove Repositories and PR sections; remove local useState for defaultBranch/autoFetch/fetchInterval
- `renderer/src/components/settings/GeneralSettings.tsx` — remove Language row
- `renderer/src/components/settings/WorktreesSettings.tsx` — remove autoCleanup and maxConcurrent rows

## Terminal Wiring (8 settings)

### Renderer side — `TerminalView.tsx`

Add `useSettingsContext()` import. Destructure `settings.terminal`. Pass all values to `new Terminal()`:

| Setting | Terminal option | Previous hardcoded value |
|---------|----------------|-------------------------|
| `fontFamily` | `fontFamily` | `'Menlo, Monaco, monospace'` |
| `fontSize` | `fontSize` | `14` |
| `cursorStyle` | `cursorStyle` | default (block) |
| `scrollbackLines` | `scrollbackLines` | default (1000) |
| `theme` | `theme` | none |
| `copyOnSelect` | `onSelectionChange` handler | none |

`copyOnSelect` has no native xterm.js option. Implement as:

```tsx
if (terminal.copyOnSelect) {
  term.onSelectionChange(() => {
    const selection = term.getSelection();
    if (selection) navigator.clipboard.writeText(selection);
  });
}
```

Theme maps to xterm.js theme object:

```tsx
theme: terminal.theme === 'dark'
  ? { background: '#1e1e1e', foreground: '#e5e5e5' }
  : { background: '#ffffff', foreground: '#000000' }
```

### Main process side — `Session.spawn()`

`Session` currently spawns `this.agentPath` as the shell command. The `terminal.defaultShell` and `terminal.shellArgs` settings provide an alternative shell.

`SessionManager.createSession()` reads `terminal.defaultShell` and `terminal.shellArgs` from `SettingsService` and passes them to `Session`. `Session` constructor gains optional `shell` and `shellArgs` parameters. `spawn()` uses them if provided, falls back to `agentPath`.

### Files changed

- `renderer/src/components/terminal/TerminalView.tsx` — read terminal settings, pass to Terminal constructor
- `src/main/session/session.ts` — accept optional shell/shellArgs in constructor, use in spawn()
- `src/main/session/session-manager.ts` — read shell settings from SettingsService, pass to Session

## General Settings Wiring (4 settings)

### `general.theme` — CSS dark mode toggle

CSS already has `@theme dark` and `@variant dark (&:where(.dark, .dark *))`. A new `GlobalSettingsEffect` component at the `App` level reads `settings.general.theme` and toggles `.dark` class on `document.documentElement`.

```tsx
useEffect(() => {
  const theme = settings?.general.theme;
  const isDark = theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}, [settings?.general.theme]);
```

For `system` theme, listen to `matchMedia` change events.

### `general.fontSize` — CSS variable override

CSS has `--text-xs` through `--text-lg` variables. The setting (`'small' | 'medium' | 'large'`) overrides `--text-base`:

```tsx
const sizeMap = { small: '11px', medium: '13px', large: '16px' };
document.documentElement.style.setProperty('--text-base', sizeMap[fontSize]);
```

### `general.defaultWorkingDirectory` — fallback cwd

In `Dashboard.tsx` `handleLaunch`, if the agent config has no `cwd`, fall back to this setting:

```tsx
const fallbackCwd = settings?.general.defaultWorkingDirectory || await window.api.cwd();
```

The default value is `~/projects`. The `~` is expanded by the main process when the session is created (node-pty resolves paths relative to the home directory).

### `general.maxConcurrentAgents` — launch guard

In `Dashboard.tsx` `handleLaunch`, check running session count before spawning:

```tsx
if (runningSessions.length >= (settings?.general.maxConcurrentAgents ?? 8)) {
  toast(`Max ${settings.general.maxConcurrentAgents} concurrent agents reached`);
  return;
}
```

### Files changed

- `renderer/src/components/settings/GlobalSettingsEffect.tsx` — new component for theme + fontSize
- `renderer/src/App.tsx` — mount `GlobalSettingsEffect` inside `SettingsProvider` at app level
- `renderer/src/components/dashboard/Dashboard.tsx` — read settings for cwd fallback + concurrency guard



## Worktrees Wiring (2 settings)

### `worktrees.directory` — default destination

In `CreateWorktreeDialog`, pre-fill the destination field with `settings.worktrees.directory` as the base path, appending the branch name. The browse button still works for one-off overrides.

### `worktrees.branchNamingPattern` — auto-generated branch names

In `CreateWorktreeDialog`, when auto-generating a branch name (e.g., from an issue), apply the selected pattern:

```tsx
const branchName = settings.worktrees.branchNamingPattern
  .replace('{number}', String(issue.number))
  .replace('{name}', slugify(issue.title))
  .replace('{id}', crypto.randomUUID().slice(0, 8));
```

### Files changed

- `renderer/src/components/github/CreateWorktreeDialog.tsx` — read worktrees settings, apply as defaults

## SettingsProvider Scope Change

Currently `SettingsProvider` wraps only the `/settings/*` route. This change requires it at the `App` level so:

1. `GlobalSettingsEffect` can apply theme/fontSize on every route
2. `Dashboard` can read `maxConcurrentAgents` and `defaultWorkingDirectory`
3. `TerminalView` can read terminal settings

Move `<SettingsProvider>` to wrap all routes in `App.tsx`.

## Complete File Change List

| File | Change |
|------|--------|
| `src/main/settings/settings-types.ts` | Remove 12 fields |
| `src/main/settings/settings-defaults.ts` | Remove corresponding defaults |
| `src/main/session/session.ts` | Accept optional shell/shellArgs |
| `src/main/session/session-manager.ts` | Read shell settings, pass to Session |
| `renderer/src/App.tsx` | Lift SettingsProvider to app level, mount GlobalSettingsEffect |
| `renderer/src/components/settings/GlobalSettingsEffect.tsx` | New — theme + fontSize sync |
| `renderer/src/components/settings/GitHubSettings.tsx` | Remove Repositories + PR sections |
| `renderer/src/components/settings/GeneralSettings.tsx` | Remove Language row |
| `renderer/src/components/settings/WorktreesSettings.tsx` | Remove autoCleanup + maxConcurrent rows |
| `renderer/src/components/terminal/TerminalView.tsx` | Read terminal settings, pass to Terminal |
| `renderer/src/components/dashboard/Dashboard.tsx` | Read settings for cwd fallback + concurrency guard |
| `renderer/src/components/github/CreateWorktreeDialog.tsx` | Read worktrees settings as defaults |
