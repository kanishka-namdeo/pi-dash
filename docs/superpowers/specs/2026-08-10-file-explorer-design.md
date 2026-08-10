# File Explorer Design Spec

**Date:** 2026-08-10  
**Status:** Draft — pending user approval  
**Design file:** `design/pidash-ui.pen` → "File Explorer Flow" frame

## Overview

A VS Code-style file tree sidebar for PiDash, providing read-only browsing of the active project's filesystem with full git-aware status colours and diff-stat badges. The file tree toggles with the FleetPanel in the existing left panel slot via a segmented control. Clicking a file opens a read-only preview in the center panel alongside the TerminalPanel.

## Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Placement | Toggle with FleetPanel in left panel slot | You rarely need both at once; keeps layout simple |
| Toggle mechanism | Segmented control ("Fleet" / "Files") in panel header | Explicit and discoverable |
| Git integration | Full LeapMux-style: status colours + diff-stat badges + filter tabs | You need to understand scope of agent changes before reviewing |
| File click behaviour | Opens read-only preview in center panel as a tab | Natural fit; you can peek without leaving PiDash |
| Center panel tabs | Tab bar: "Terminal" \| "File: filename.ts" | Explicit, familiar from browsers/IDEs |
| Directory listing | Lazy loading via IPC on expand | Instant initial load; scales to huge repos |
| Context menu | Copy Path, Copy Relative Path, Reveal in File Manager, Open in Terminal | All feasible with Electron shell APIs; consistent with read-only model |
| Active files | Separate "Active Files" section at top of tree | Keeps tree clean; active files are a separate concern |
| Read-only | No file editing, creation, or deletion | PiDash is an orchestrator, not an editor |

---

## Architecture

### Placement

The file tree lives in the existing left panel slot, replacing FleetPanel when the "Files" tab is active. The segmented control in the panel header toggles between "Fleet" and "Files" views.

### Data Flow

1. **Renderer** — `FileTreePanel` component manages tree state (expanded dirs, selected file). On directory expand, fires IPC `filetree:listDir` with the directory path. On mount, fires `filetree:getGitStatus` for the project root.

2. **Main process** — New IPC handlers in `src/main/ipc/`:
   - `filetree:listDir({ path })` → returns `FileEntry[]` (name, type, path, children lazy)
   - `filetree:getGitStatus({ repoPath })` → returns `Map<relativePath, GitStatus>` (status + diff stats)
   - `filetree:getFileContent({ path })` → returns file text for preview

3. **Git integration** — Extends `src/main/git-operations.ts` with `getGitStatus()` and `getDiffStats()` using the existing `simple-git` dependency.

4. **Active Files** — A separate section at the top of the tree. Shows files modified in the last 30 seconds across all running agent sessions' CWDs. Polled every 5 seconds via `fs.stat()` on the active project path.

### Center Panel

Tab bar with "Terminal" and "File: <name>" tabs. Clicking a file in the tree opens/activates the File tab. File preview is read-only with syntax highlighting.

### Context Menu

Four actions, all via Electron `shell` APIs:

- Copy Path
- Copy Relative Path
- Reveal in File Manager
- Open in Terminal

---

## Components

### `FileTreePanel` (new)

**File:** `renderer/src/components/dashboard/FileTreePanel.tsx`

Replaces FleetPanel in the left panel slot when "Files" tab is active.

**Structure:**

- **Header:** Segmented control ("Fleet" / "Files"), refresh button, collapse button
- **Active Files section** (top): Flat list of recently-modified files with file icon, path, and relative time ("2m ago"). Clicking opens the file in the center preview.
- **Filter tabs** (below Active Files): All / Changed / Staged / Unstaged. Only visible when the project is a git repo.
- **Directory tree** (main area): Lazy-loaded on expand. Each row shows:
  - Chevron (rotated when expanded)
  - Folder/file icon (git-status tinted)
  - Name
  - Diff-stat badge (`+12 -4 *1`) for changed files/directories
- **Context menu** on right-click: Copy Path, Copy Relative Path, Reveal in File Manager, Open in Terminal

### `FilePreview` (new)

**File:** `renderer/src/components/dashboard/FilePreview.tsx`

Lives in the center panel as a tab alongside TerminalPanel.

**Structure:**

- **Header:** File path, file size, "Expand" button (opens fullscreen modal)
- **Content:** Syntax-highlighted text with line numbers
- **Supports:**
  - Text files (syntax highlighted)
  - Markdown (rendered/source toggle)
  - Images (zoomable)
  - Binary/oversize (fallback card with "too large" message)
- Read-only — no save button

### Tab Bar (modification to TerminalPanel area)

When a file is selected, the center panel shows a tab bar: "Terminal" | "File: filename.ts". Clicking "Terminal" returns to the terminal view. Multiple file tabs not supported in v1 (single file preview slot).

### State Management

- Tree expansion state stored in a local `Map<string, boolean>` (path → expanded)
- Git status cached in a `Map<string, GitStatus>` keyed by relative path
- Cache invalidated on refresh button click
- Git status auto-refreshes every 30 seconds when the Files panel is active
- Active Files section polls every 5 seconds for recently-modified files

---

## Git Status Colours

| State | Colour | Meaning |
| --- | --- | --- |
| Conflict / unmerged | Red | The file is in a merge conflict |
| Untracked | Green | A new file git is not yet tracking |
| Staged only | Green | Changes are staged and working copy has no further unstaged changes |
| Modified / unstaged | Amber | The working copy has unstaged changes |
| Changed directory | Amber (dimmed) | A folder containing changed files somewhere below it |

### Diff-Stat Badges

Each changed row shows a diff-stat badge in the form `+N -M *U`:

- `+N` — lines added (green)
- `-M` — lines deleted (red)
- `*U` — number of untracked files (amber)

A directory's badge aggregates the stats of everything changed beneath it. A badge with all-zero counts is hidden.

---

## Error Handling & Edge Cases

### Non-git project

- Filter tabs are hidden
- All file icons show neutral colour (no git status)
- Tree still loads and works normally

### Large directories

- If a directory has >256 entries, show truncated listing with inline row: "`<N>+ more entries`"
- No recursive expansion of truncated dirs

### File read errors

- If `getFileContent` fails (file deleted, permission denied), show inline error banner: "Could not read file: <reason>"
- Offer "Retry" and "Close" buttons

### Binary files

- If a file is detected as binary (non-printable bytes in first 8KB), show fallback card: "Binary file — cannot display inline"
- Offer "Reveal in File Manager" and "Open in Terminal" actions

### Oversize files

- If a file is >1MB, show fallback card: "File too large to preview (<size>)"
- Same actions as binary

### Agent CWD doesn't exist

- Active Files section shows "Agent working directory not found"
- Tree falls back to the active project root

### Git status fetch fails

- Silently fall back to no git status (neutral icons)
- No error banner — git is optional

### Lazy load failure

- If a directory can't be read (permission denied), show "Permission denied" inline row under the directory
- Don't expand the directory

### Network/remote paths

- `fs.readdir` works normally; no special handling needed
- Git status may be slow; no timeout in v1

---

## Testing

### Unit tests — `FileTreePanel.test.tsx`

- Renders empty tree when no project is active
- Expands directory on click, shows children
- Lazy loads children only on first expand
- Active Files section shows recently modified files
- Filter tabs hidden when not a git repo
- Context menu renders with correct actions

### Unit tests — `FilePreview.test.tsx`

- Shows syntax-highlighted text for `.ts` files
- Shows markdown rendered/source toggle
- Shows fallback card for binary files
- Shows fallback card for oversize files
- Expand button opens fullscreen modal

### Integration tests — `filetree-handlers.test.ts` (main process)

- `filetree:listDir` returns correct entries for a test directory
- `filetree:getGitStatus` returns correct status for staged/unstaged/untracked files
- `filetree:getFileContent` returns file text
- Handles missing directories gracefully

### Manual testing checklist

- Open a project with git changes → verify status colours and diff badges
- Expand nested directories → verify lazy loading
- Click a file → verify tab opens in center panel
- Right-click a file → verify context menu actions work
- Click refresh → verify git status updates
- Open a binary file → verify fallback card

---

## Implementation Notes

### New files

- `renderer/src/components/dashboard/FileTreePanel.tsx`
- `renderer/src/components/dashboard/FilePreview.tsx`
- `src/main/ipc/filetree-handlers.ts`
- `src/main/ipc/filetree-handlers.test.ts`

### Modified files

- `src/main/git-operations.ts` — add `getGitStatus()` and `getDiffStats()`
- `src/main/ipc-handlers.ts` or new IPC registration — register `filetree:*` handlers
- `src/preload.ts` — expose `filetree` API to renderer
- `renderer/src/components/dashboard/Dashboard.tsx` — integrate FileTreePanel toggle
- `renderer/src/components/dashboard/TerminalPanel.tsx` — add tab bar support

### Dependencies

- No new dependencies required
- `simple-git` already available for git operations
- Syntax highlighting: use existing approach or lightweight `prismjs` if not already present

### IPC API (new)

```typescript
// Renderer → Main
filetree:listDir({ path: string }) → { entries: FileEntry[] }
filetree:getGitStatus({ repoPath: string }) → { status: Record<string, GitStatusEntry> }
filetree:getFileContent({ path: string }) → { content: string; size: number; isBinary: boolean }

// Types
interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  hasChildren?: boolean; // for lazy loading
}

interface GitStatusEntry {
  status: 'untracked' | 'staged' | 'modified' | 'conflict';
  additions: number;
  deletions: number;
  untrackedCount?: number;
}
```
