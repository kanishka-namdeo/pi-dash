# File Explorer Stability & Resilience Design Spec

**Date:** 2026-08-10  
**Status:** Draft — pending user approval  
**Supersedes:** v1 file explorer spec (2026-08-10-file-explorer-design.md) — this is a hardening pass, not a feature change

## Overview

A comprehensive stability and resilience pass on the file explorer. The v1 implementation works but has race conditions, missing security validation, polling-based updates, no virtualization for large trees, and fragile error handling. This spec addresses all of these with a pattern-first approach: introduce cross-cutting utilities, then apply them systematically.

### Scope

- **In scope:** Race condition fixes, path validation, real-time file watching, virtualization, error boundaries, improved binary detection, recursive active files, UI polish
- **Out of scope:** File editing/creation/deletion, drag-and-drop, search/filter within tree, breadcrumbs, multi-file tabs

---

## Architecture

### Approach: Pattern-First

Three shared utilities are introduced first, then applied to every handler and component:

1. **`AbortableIPC`** — renderer-side hook for request cancellation and stale response protection
2. **`pathValidator`** — main process utility for path security
3. **`FileWatcherService`** — main process service replacing polling with event-driven updates

This ensures consistency and makes the patterns reusable for future features.

---

## Shared Infrastructure

### 1. AbortableIPC (renderer-side)

**File:** `renderer/src/lib/abortableIPC.ts`

A React hook that wraps IPC calls with AbortController. Key behaviors:

- Each call gets a unique request ID tracked per IPC channel
- If a new request fires for the same channel before the previous resolves, the previous is aborted (stale response dropped)
- Returns `{ data, aborted }` so callers can ignore stale results
- Cleans up on component unmount (aborts all in-flight requests)
- Includes a 10-second timeout wrapper — aborts and throws if IPC hangs

```ts
// Usage pattern:
const { call, abortAll } = useAbortableIPC();
const result = await call('filetree:listDir', { path });
if (result.aborted) return; // stale, ignore
// use result.data
```

Internally tracks a `Map<channel, AbortController>`. New call on same channel aborts previous.

### 2. pathValidator (main process)

**File:** `src/main/lib/pathValidator.ts`

Validates that a given path is within an allowed project root.

```ts
export function validatePath(
  requestedPath: string,
  allowedRoots: string[]
): { valid: true; resolved: string } | { valid: false; reason: string }
```

- Resolves symlinks via `fs.realpath` to prevent symlink escapes
- Rejects paths with `..` that escape the root after resolution
- Uses `path.resolve()` to normalize, then checks result starts with project root
- `allowedRoots` populated from project manager's active project list at handler registration time

**Known limitation:** When a project is removed, there's a brief window where its paths are still accessible until the next handler refresh cycle. This is acceptable risk — these are the user's own files.

### 3. FileWatcherService (main process)

**File:** `src/main/filetree/file-watcher.ts`

Replaces polling with event-driven updates using Node's `fs.watch`.

- Recursive mode on Windows/macOS; fallback to shallow polling on Linux (where `fs.watch` recursive is unreliable)
- Emits debounced events: `'files-changed'` (200ms debounce) and `'git-changed'` (1s debounce — git operations are expensive)
- Tracks watched paths per project; cleans up watchers when project changes
- API: `watch(projectPath)`, `unwatch(projectPath)`, `on(event, callback)`

**Fallback for silent watcher failures:** The renderer tracks a `lastEventTimestamp`. If no events arrive for 2 minutes, a slow 60s poll activates as a safety net (handles network drives, WSL mounts, etc.). If events resume, the poll deactivates.

**Push-based IPC:** Main process sends events to renderer via `webContents.send`:

```ts
// Main → Renderer
'filetree:watch-event': { type: 'git-changed' | 'files-changed', projectPath: string }
```

---

## Main Process Hardening

### Path Validation on All Handlers

Every handler in `filetree-handlers.ts` that accepts a `path` parameter gets validated:

```ts
const check = validatePath(dirPath, allowedRoots);
if (!check.valid) throw new Error(`Path not allowed: ${check.reason}`);
```

**Affected handlers:** `listDir`, `getFileContent`, `copyPath`, `revealInFileManager`, `openInTerminal`, `getActiveFiles`, `getGitStatus`

### Improved Binary Detection

Current implementation checks for null bytes in first 8KB. This misidentifies UTF-16 files (null bytes between every ASCII char) as binary.

**New approach — check first 512 bytes:**

1. Check for UTF-8 BOM (`EF BB BF`) → text
2. Check for UTF-16 LE BOM (`FF FE`) or BE BOM (`FE FF`) → text
3. Otherwise, scan for null bytes → if found, binary
4. Check if bytes are valid UTF-8 (no orphan continuation bytes) → if invalid UTF-8 and no BOM, binary

### Recursive Active Files

Current `getActiveFiles` only scans the top-level directory. The spec says it should find files modified across agent CWDs.

**New behavior:**

- Recursively scan up to 3 levels deep from each agent CWD (or project root if no agent CWDs)
- Skip noisy directories: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `__pycache__`
- Keep 30-second threshold and 10-file cap
- Sort by modification time, most recent first

### FileWatcherService Integration

Replace polling-based patterns:

- **Git status:** Main process watches `.git/` directory, pushes `git-changed` event. Renderer re-fetches on event.
- **Active files:** Main process watches project tree, pushes `files-changed` event. Renderer re-fetches on event.
- **Manual refresh button:** Still works — triggers immediate re-fetch regardless of watcher state.

---

## Renderer Race Condition Fixes

### FileTreePanel — Directory Expansion

Wrap all `window.api.filetree.*` calls with `useAbortableIPC`:

```ts
const { call } = useAbortableIPC();

const handleToggleExpand = async (node: TreeNode) => {
  const result = await call('filetree:listDir', { path: node.path });
  if (result.aborted) return; // stale, ignore
  // ... update tree state with result.data.entries
};
```

If user clicks expand on dir A, then B, then A again — first A request is aborted, only latest completes.

**Additional fix:** Batch state updates. Currently `handleToggleExpand` does 3 separate `setState` calls. Use a single state update to avoid intermediate renders with inconsistent state.

### FilePreview — File Content Loading

Same pattern:

```ts
useEffect(() => {
  if (!path) return;
  const loadFile = async () => {
    setIsLoading(true);
    setContent(null); // reset to avoid stale content flash
    const result = await call('filetree:getFileContent', { path });
    if (result.aborted) return;
    setContent(result.data.content);
    // ...
  };
  loadFile();
}, [path]);
```

When `path` changes, previous `call` is automatically aborted.

### Event-Driven Updates

Subscribe to `filetree:watch-event` instead of polling:

```ts
useEffect(() => {
  if (!activeProject?.path) return;
  const unsubscribe = window.api.filetree.onWatchEvent((event) => {
    if (event.projectPath !== activeProject.path) return;
    if (event.type === 'git-changed') refreshGitStatus();
    if (event.type === 'files-changed') refreshActiveFiles();
  });
  return unsubscribe;
}, [activeProject?.path]);
```

Remove both `setInterval` calls. Add renderer-side debounce (500ms) to batch rapid watcher events.

---

## Virtualization

### Add react-window

```bash
pnpm add react-window
pnpm add -D @types/react-window
```

### Replace flatTree Rendering

Current code renders all rows directly. Replace with `FixedSizeList`:

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={containerHeight}
  itemCount={flatTree.length}
  itemSize={24}
  width="100%"
>
  {({ index, style }) => {
    const { node, depth } = flatTree[index];
    return (
      <div style={style}>
        <TreeRow node={node} depth={depth} ... />
      </div>
    );
  }}
</FixedSizeList>
```

- `itemSize={24}` — current rows are ~24px (verify)
- `containerHeight` — measure with ref + `ResizeObserver`
- Extract row rendering into `TreeRow` component
- Keyboard navigation still works — `flatTree` index maps directly to list index

### Performance Optimization

- Memoize `TreeRow` with `React.memo`
- Tighten `flatTree` useMemo dependency array
- Debounce `directoryStatus` recomputation on git status updates

---

## Error Handling & Edge Cases

### Error Boundary Around FilePreview

Place in `TerminalPanel.tsx` where FilePreview is rendered:

```tsx
class FilePreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('FilePreview error:', error); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

Fallback: "Could not render file preview" with Retry button.

### Keyboard Navigation Stability

After any tree rebuild, clamp `focusedIndex`:

```ts
useEffect(() => {
  if (focusedIndex >= flatTree.length) {
    setFocusedIndex(Math.max(0, flatTree.length - 1));
  }
}, [flatTree.length, focusedIndex]);
```

If the previously focused node still exists in the new tree, preserve its index; otherwise reset to -1.

### Context Menu — Migrate to Radix

Replace custom context menu with Radix `context-menu` (already in dependencies):

- Better accessibility (keyboard navigation, screen reader support)
- Automatic viewport clamping (no manual positioning math)
- Consistent with other Radix primitives in the app

### IPC Timeout Handling

10-second timeout in `AbortableIPC`. On timeout, show toast: "Operation timed out. The file system may be slow."

### Graceful Degradation

- If `fs.watch` fails to initialize → log warning, fall back to polling silently
- If git is not installed → silently disable git features (already done)
- If Prism fails to load → show plain text without syntax highlighting (already done)

---

## UI Changes

### 1. Replace Custom Context Menu with Radix

Radix `context-menu` is already in dependencies. Provides better accessibility and automatic viewport clamping.

### 2. Add Watcher Status Indicator

Small dot/icon in tree header:
- Green dot when file watcher is active
- Gray dot when fallback polling is active
- Tooltip: "Watching for changes" or "Fallback polling (watcher unavailable)"

### 3. Improve Manual Refresh Button

- Add spin animation on `RefreshCw` icon during refresh
- Refresh both git status AND file tree (currently only refreshes git)
- Debounce rapid clicks (500ms)

### 4. Add Toast Notifications for Errors

- Replace silent fail in active files with `toast.error()`
- Notify on IPC timeouts
- Notify on watcher failures

### 5. Use Reusable Spinner Component

Replace custom inline spinners with `<Spinner size={16} />` from `ui/Spinner.tsx` for consistency.

### 6. Add "Last Updated" Timestamp (Optional)

Track `lastEventTime` when file watcher fires. Display in tree header: "Updated 2m ago".

---

## Component Integration Map

### Dashboard.tsx
- Manages `activeProject` and `previewFile` state
- Passes `onFileSelect` to FileTreePanel
- **No changes needed** — state management is clean

### TerminalPanel.tsx
- Receives `previewFile` prop, renders FilePreview
- **Add error boundary** around FilePreview

### FileTreePanel.tsx
- Remove both `setInterval` calls
- Subscribe to `filetree:watch-event`
- Add watcher status indicator to header
- Improve refresh button (loading state, refresh tree too)
- Replace custom context menu with Radix
- Use `useAbortableIPC` for all IPC calls
- Add virtualization with `react-window`
- Use reusable `Spinner` component

### FilePreview.tsx
- Use `useAbortableIPC` for `getFileContent` calls
- Reset content state when path changes

---

## Testing

### Unit Tests — New Utilities

**`abortableIPC.test.ts`:**
- Aborts previous request when new request fires on same channel
- Returns `{ aborted: true }` for stale responses
- Cleans up all controllers on unmount
- Timeout triggers abort and throws error

**`pathValidator.test.ts`:**
- Accepts paths within allowed root
- Rejects paths outside allowed root
- Rejects symlink escapes
- Handles Windows paths correctly
- Normalizes `..` and `.` correctly

**`file-watcher.test.ts`:**
- Emits `files-changed` event when file is created/modified/deleted
- Debounces rapid events
- Cleans up watchers on unwatch
- Falls back to polling on Linux if recursive watch fails

### Updated Tests

**`FileTreePanel.test.tsx`:**
- Rapid expand/collapse doesn't cause stale state
- Keyboard navigation clamps focus index when tree shrinks
- Context menu uses Radix primitives

**`FilePreview.test.tsx`:**
- Clicking files rapidly shows correct file (no stale content)
- Error boundary catches Prism errors and shows fallback

**`filetree-handlers.test.ts`:**
- Path validation rejects paths outside project
- Binary detection handles UTF-16 files correctly
- Active files scans recursively (3 levels deep)
- Active files skips node_modules, .git, etc.

### Integration Tests

- Open project with 1000+ files → tree renders without lag
- Modify file externally → active files updates within 1s
- Run `git add` externally → git status updates within 2s

---

## New Files

- `renderer/src/lib/abortableIPC.ts`
- `src/main/lib/pathValidator.ts`
- `src/main/filetree/file-watcher.ts`
- `renderer/src/lib/abortableIPC.test.ts`
- `src/main/lib/pathValidator.test.ts`
- `src/main/filetree/file-watcher.test.ts`

## Modified Files

- `src/main/ipc/filetree-handlers.ts` — path validation, improved binary detection, recursive active files
- `renderer/src/components/dashboard/FileTreePanel.tsx` — AbortableIPC, event-driven updates, virtualization, Radix context menu, watcher indicator, refresh improvements
- `renderer/src/components/dashboard/FilePreview.tsx` — AbortableIPC, content reset on path change
- `renderer/src/components/dashboard/TerminalPanel.tsx` — error boundary around FilePreview
- `renderer/src/types/filetree.ts` — add `onWatchEvent` to FiletreeAPI interface
- `src/preload.ts` — expose `onWatchEvent` listener

## New Dependencies

- `react-window` — tree virtualization
- `@types/react-window` — TypeScript types

---

## Implementation Notes

### Migration Path

1. Add new utilities (AbortableIPC, pathValidator, FileWatcherService) — no existing code breaks
2. Apply path validation to handlers — additive, no behavior change for valid paths
3. Replace polling with FileWatcherService — remove setInterval, add event subscription
4. Apply AbortableIPC to components — wrap existing IPC calls
5. Add virtualization — replace flatTree rendering with FixedSizeList
6. Migrate context menu to Radix — replace custom implementation
7. Add error boundaries and UI polish — additive improvements

### Backwards Compatibility

All changes are additive or internal. No IPC API changes, no prop changes, no breaking changes to component interfaces. The file explorer behaves identically from the user's perspective — just faster, safer, and more resilient.

### Performance Targets

- Tree with 1000+ visible rows: no lag during scroll (virtualization)
- Rapid directory expand/collapse: no stale state (AbortableIPC)
- Rapid file clicks: correct content displayed (AbortableIPC)
- External file modification: UI updates within 1s (FileWatcherService)
- External git operation: UI updates within 2s (FileWatcherService)
