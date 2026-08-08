# Settings Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect all unwired settings to the code they describe; remove settings with no behavioral target.

**Architecture:** Lift `SettingsProvider` to app level so all components can read settings. Wire terminal settings to `TerminalView` and `Session`. Wire general settings to CSS theme/fontSize and Dashboard launch logic. Wire worktree settings to `CreateWorktreeDialog`. Remove 12 schema fields that have no behavioral target.

**Tech Stack:** Electron, React, xterm.js, electron-store, Tailwind CSS

## Global Constraints

- Remove 12 settings fields from `SettingsSchema` that have no behavioral target
- No new systems (i18n, event workflows, template infrastructure)
- `SettingsProvider` must wrap all routes in `App.tsx` (not just `/settings/*`)
- Terminal settings read via `useSettingsContext()` inside `TerminalView`
- Shell settings read via `SettingsService` in `SessionManager`, passed to `Session`
- Theme applied via `.dark` class on `document.documentElement`
- Font size applied via `--text-base` CSS variable override

---

### Task 1: Lift SettingsProvider to App Level

**Files:**
- Modify: `renderer/src/App.tsx`
- Create: `renderer/src/components/settings/GlobalSettingsEffect.tsx`

**Interfaces:**
- Consumes: `useSettings` hook from `../../hooks/useSettings`
- Produces: `GlobalSettingsEffect` component that applies theme and fontSize globally

- [ ] **Step 1: Create GlobalSettingsEffect component**

Create `renderer/src/components/settings/GlobalSettingsEffect.tsx`:

```tsx
import { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function GlobalSettingsEffect() {
  const { settings } = useSettings();

  // Theme sync
  useEffect(() => {
    const theme = settings?.general.theme;
    if (!theme) return;

    const applyTheme = () => {
      const isDark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [settings?.general.theme]);

  // Font size sync
  useEffect(() => {
    const fontSize = settings?.general.fontSize;
    if (!fontSize) return;
    const sizeMap = { small: '11px', medium: '13px', large: '16px' };
    document.documentElement.style.setProperty('--text-base', sizeMap[fontSize]);
  }, [settings?.general.fontSize]);

  return null;
}
```

- [ ] **Step 2: Lift SettingsProvider in App.tsx**

Modify `renderer/src/App.tsx`. Move `<SettingsProvider>` from the `/settings/*` route to wrap all routes. Add `<GlobalSettingsEffect>` inside it.

Find this line (around line 120):
```tsx
<Route path="/settings/*" element={<SettingsProvider><SettingsScreen /></SettingsProvider>} />
```

Change to:
```tsx
<Route path="/settings/*" element={<SettingsScreen />} />
```

Then wrap the entire `<Routes>` block with `<SettingsProvider>` and add `<GlobalSettingsEffect>`:

```tsx
<SettingsProvider>
  <GlobalSettingsEffect />
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {/* ... other routes ... */}
      <Route path="/settings/*" element={<SettingsScreen />} />
      {/* ... */}
    </Routes>
  </BrowserRouter>
</SettingsProvider>
```

Add the import at the top:
```tsx
import { GlobalSettingsEffect } from './components/settings/GlobalSettingsEffect';
```

- [ ] **Step 3: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add renderer/src/App.tsx renderer/src/components/settings/GlobalSettingsEffect.tsx
git commit -m "feat: lift SettingsProvider to app level, add GlobalSettingsEffect"
```

---

### Task 2: Schema Cleanup — Remove 12 Fields

**Files:**
- Modify: `src/main/settings/settings-types.ts`
- Modify: `src/main/settings/settings-defaults.ts`
- Test: `src/main/settings/__tests__/settings-service.test.ts`

**Interfaces:**
- Consumes: Existing `SettingsSchema` interface
- Produces: Cleaned schema with `github` section removed, `general.language` removed, `worktrees.autoCleanup` and `worktrees.maxConcurrent` removed

- [ ] **Step 1: Update test that references removed field**

The test at line 38-42 references `general.language` which will be removed. Change it to use `general.restoreSession` instead:

```ts
it('persists changes across instances', () => {
  service.set('general.restoreSession', false);
  const service2 = new SettingsService();
  expect(service2.get('general.restoreSession')).toBe(false);
});
```

- [ ] **Step 2: Remove fields from SettingsSchema**

Modify `src/main/settings/settings-types.ts`. Remove these fields:

From `general`:
- `language: string;`

Remove entire `github` section:
```ts
github: {
  authMethod: 'pat' | 'oauth';
  autoCreateWorktree: boolean;
  defaultPRTemplate: string;
  autoLinkCommits: boolean;
};
```

From `worktrees`:
- `autoCleanup: boolean;`
- `maxConcurrent: number;`

- [ ] **Step 3: Remove corresponding defaults**

Modify `src/main/settings/settings-defaults.ts`. Remove:

From `general`:
- `language: 'en',`

Remove entire `github` section:
```ts
github: {
  authMethod: 'pat',
  autoCreateWorktree: false,
  defaultPRTemplate: 'default',
  autoLinkCommits: true,
},
```

From `worktrees`:
- `autoCleanup: false,`
- `maxConcurrent: 10,`

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/main/settings/__tests__/settings-service.test.ts`
Expected: All tests pass

- [ ] **Step 5: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors (UI components that reference removed fields will break in Task 3)

- [ ] **Step 6: Commit**

```bash
git add src/main/settings/settings-types.ts src/main/settings/settings-defaults.ts src/main/settings/__tests__/settings-service.test.ts
git commit -m "refactor: remove 12 unwired settings from schema"
```

---

### Task 3: UI Tab Cleanup

**Files:**
- Modify: `renderer/src/components/settings/GitHubSettings.tsx`
- Modify: `renderer/src/components/settings/GeneralSettings.tsx`
- Modify: `renderer/src/components/settings/WorktreesSettings.tsx`

**Interfaces:**
- Consumes: Cleaned `SettingsSchema` from Task 2
- Produces: UI tabs that only show settings that exist in the schema

- [ ] **Step 1: Clean up GitHubSettings.tsx**

Modify `renderer/src/components/settings/GitHubSettings.tsx`.

Remove the local useState for fields not in schema (lines 14-17):
```tsx
// UI-only state for fields not in settings schema
const [defaultBranch, setDefaultBranch] = useState('main')
const [autoFetch, setAutoFetch] = useState(false)
const [fetchInterval, setFetchInterval] = useState('5')
```

Remove the entire "Repositories" `<SectionCard>` (lines 68-100).

Remove the entire "Pull Requests & Issues" `<SectionCard>` (lines 102-132).

Keep only the "Authentication" section.

Remove unused imports: `useState` (if no longer needed), `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `Switch`.

- [ ] **Step 2: Clean up GeneralSettings.tsx**

Modify `renderer/src/components/settings/GeneralSettings.tsx`.

Remove the "Language" `<SettingsRow>` and its `<RowSeparator>`. Find the block that starts with:
```tsx
<SettingsRow label="Language" description="Display language">
```

And remove it along with the `<RowSeparator />` before it.

- [ ] **Step 3: Clean up WorktreesSettings.tsx**

Modify `renderer/src/components/settings/WorktreesSettings.tsx`.

Remove the "Auto-cleanup merged worktrees" `<SettingsRow>` and its `<RowSeparator>`. Find:
```tsx
<SettingsRow label="Auto-cleanup merged worktrees"
```

Remove the row and the `<RowSeparator />` after it.

Remove the "Max concurrent worktrees" `<SettingsRow>` and its `<RowSeparator>`. Find:
```tsx
<SettingsRow label="Max concurrent worktrees"
```

Remove the row and the `<RowSeparator />` before it.

Remove unused constants at the top:
```tsx
const MAX_CONCURRENT_OPTIONS = [5, 10, 15, 20] as const
```

- [ ] **Step 4: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/settings/GitHubSettings.tsx renderer/src/components/settings/GeneralSettings.tsx renderer/src/components/settings/WorktreesSettings.tsx
git commit -m "refactor: remove UI controls for deleted settings"
```

---

### Task 4: Terminal Wiring — Renderer Side (6 settings)

**Files:**
- Modify: `renderer/src/components/terminal/TerminalView.tsx`

**Interfaces:**
- Consumes: `useSettingsContext()` from `../../context/SettingsContext`
- Produces: Terminal instance configured from settings

- [ ] **Step 1: Add settings import to TerminalView**

Modify `renderer/src/components/terminal/TerminalView.tsx`.

Add import at the top:
```tsx
import { useSettingsContext } from '../../context/SettingsContext';
```

Inside the `TerminalView` component, after the existing hooks (around line 22), add:
```tsx
const { settings } = useSettingsContext();
```

- [ ] **Step 2: Pass settings to Terminal constructor**

Replace the hardcoded `new Terminal()` call (lines 27-31) with:

```tsx
const terminal = settings?.terminal;
const term = new Terminal({
  cursorBlink: true,
  fontSize: terminal?.fontSize ?? 14,
  fontFamily: terminal?.fontFamily ?? 'Geist Mono, monospace',
  cursorStyle: terminal?.cursorStyle ?? 'block',
  scrollbackLines: terminal?.scrollbackLines ?? 10000,
  theme: terminal?.theme === 'light'
    ? { background: '#ffffff', foreground: '#000000' }
    : { background: '#1e1e1e', foreground: '#e5e5e5' },
});
```

- [ ] **Step 3: Wire copyOnSelect**

After `term.open(terminalRef.current)` (line 35), add:

```tsx
if (terminal?.copyOnSelect) {
  term.onSelectionChange(() => {
    const selection = term.getSelection();
    if (selection) navigator.clipboard.writeText(selection);
  });
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/terminal/TerminalView.tsx
git commit -m "feat: wire terminal settings to TerminalView"
```

---

### Task 5: Terminal Wiring — Main Process Side (2 settings)

**Files:**
- Modify: `src/main/session/session.ts`
- Modify: `src/main/session/session-manager.ts`

**Interfaces:**
- Consumes: `SettingsService` from `../settings/settings-service`
- Produces: `Session` accepts optional `shell` and `shellArgs` parameters

- [ ] **Step 1: Add shell/shellArgs to Session constructor**

Modify `src/main/session/session.ts`.

Add private fields after the existing private fields (around line 19):
```ts
private readonly shell?: string;
private readonly shellArgs?: string;
```

Update the constructor (line 22) to accept optional shell params:
```ts
constructor(agentId: string, cwd: string, private readonly agentPath: string, shell?: string, shellArgs?: string) {
  this.agentId = agentId;
  this.cwd = cwd;
  this.shell = shell;
  this.shellArgs = shellArgs;
}
```

- [ ] **Step 2: Use shell in spawn()**

Modify the `spawn()` method (line 27-57). Replace the `pty.spawn` call (line 29) with:

```ts
const shell = this.shell || this.agentPath;
const args = this.shellArgs ? this.shellArgs.split(/\s+/).filter(Boolean) : [];
this.pty = pty.spawn(shell, args, {
  cwd: this.cwd,
  name: 'xterm-256color',
});
```

- [ ] **Step 3: Read shell settings in SessionManager**

Modify `src/main/session/session-manager.ts`.

Add import at the top:
```ts
import { SettingsService } from '../settings/settings-service';
```

Add a private field to the `SessionManager` class:
```ts
private settingsService = new SettingsService();
```

In `createSession()`, after loading the agent (line 17), read shell settings:
```ts
const defaultShell = this.settingsService.get('terminal.defaultShell') as string | undefined;
const shellArgs = this.settingsService.get('terminal.shellArgs') as string | undefined;
```

Pass them to the `Session` constructor (line 23):
```ts
const session = new Session(agentId, cwd, agent.path, defaultShell, shellArgs);
```

- [ ] **Step 4: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/session/session.ts src/main/session/session-manager.ts
git commit -m "feat: wire terminal shell settings to Session"
```

---

### Task 6: Dashboard Wiring (2 settings)

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `useSettingsContext()` from `../../context/SettingsContext`
- Produces: Launch guard for `maxConcurrentAgents`, fallback cwd from `defaultWorkingDirectory`

- [ ] **Step 1: Add settings import to Dashboard**

Modify `renderer/src/components/dashboard/Dashboard.tsx`.

Add import at the top:
```tsx
import { useSettingsContext } from '../../context/SettingsContext';
```

Inside the `Dashboard` component, after the existing hooks (around line 41), add:
```tsx
const { settings } = useSettingsContext();
```

- [ ] **Step 2: Add concurrency guard to handleLaunch**

In the `handleLaunch` function (line 94), after finding the agent (line 95-96), add:

```tsx
const maxConcurrent = settings?.general.maxConcurrentAgents ?? 8;
if (runningSessions.length >= maxConcurrent) {
  toast.error(`Max ${maxConcurrent} concurrent agents reached`);
  return;
}
```

- [ ] **Step 3: Add fallback cwd to handleLaunch**

In the `handleLaunch` function, replace the `session.create` call (line 99) with:

```tsx
const cwd = agent.cwd || settings?.general.defaultWorkingDirectory || await window.api.cwd();
const result = await window.api.session.create(agentId, cwd);
```

Also update the `registerSession` call (line 104) to use the same `cwd`:
```tsx
ctx.registerSession(agentId, result.pid, cwd);
```

- [ ] **Step 4: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: wire maxConcurrentAgents and defaultWorkingDirectory to Dashboard"
```

---

### Task 7: Worktrees Wiring (2 settings)

**Files:**
- Modify: `renderer/src/components/github/CreateWorktreeDialog.tsx`

**Interfaces:**
- Consumes: `useSettingsContext()` from `../../context/SettingsContext`
- Produces: Dialog pre-filled with `worktrees.directory` and `worktrees.branchNamingPattern`

- [ ] **Step 1: Add settings import to CreateWorktreeDialog**

Modify `renderer/src/components/github/CreateWorktreeDialog.tsx`.

Add import at the top:
```tsx
import { useSettingsContext } from '../../context/SettingsContext';
```

Inside the component, after the existing state declarations (around line 18), add:
```tsx
const { settings } = useSettingsContext();
```

- [ ] **Step 2: Apply branchNamingPattern to auto-generated branch names**

Replace the initial `branch` state (line 16) with a `useEffect` that generates the branch name from the pattern when `issueNumber` changes:

```tsx
const [branch, setBranch] = useState('');

useEffect(() => {
  if (!issueNumber || !settings?.worktrees.branchNamingPattern) return;
  const pattern = settings.worktrees.branchNamingPattern;
  const generated = pattern
    .replace('{number}', String(issueNumber))
    .replace('{name}', `issue-${issueNumber}`)
    .replace('{id}', crypto.randomUUID().slice(0, 8));
  setBranch(generated);
}, [issueNumber, settings?.worktrees.branchNamingPattern]);
```

- [ ] **Step 3: Apply worktrees.directory as default destination**

Replace the initial `destination` state (line 18) with a `useEffect` that sets the default when the dialog opens:

```tsx
const [destination, setDestination] = useState('');

useEffect(() => {
  if (open && settings?.worktrees.directory && !destination) {
    setDestination(`${settings.worktrees.directory}/${branch}`);
  }
}, [open, settings?.worktrees.directory]);
```

This runs once when the dialog opens with loaded settings. After that, user edits to the destination field are preserved.

- [ ] **Step 4: Verify build**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/github/CreateWorktreeDialog.tsx
git commit -m "feat: wire worktrees directory and branchNamingPattern to CreateWorktreeDialog"
```

---

### Task 8: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full type check**

Run: `pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 3: Start dev server and manually verify**

Run: `pnpm dev`

Verify:
1. Navigate to Settings → each tab shows content (not blank)
2. General tab: no Language row
3. GitHub tab: only Authentication section visible
4. Worktrees tab: no autoCleanup or maxConcurrent rows
5. Toggle theme in General → app switches dark/light
6. Change terminal font size in Terminal settings → terminal updates
7. Launch an agent → terminal uses configured font/shell

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address verification issues"
```
