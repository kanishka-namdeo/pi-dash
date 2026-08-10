# File Explorer Design Spec

**Date:** 2026-08-10  
**Status:** Draft — pending user approval  
**Design file:** `design/pidash-ui.pen` → "File Explorer Flow" frame

## Overview

A VS Code-style file tree sidebar for PiDash, providing read-only browsing of the active project's filesystem with full git-aware status colours and diff-stat badges. The file tree toggles with the FleetPanel in the existing left panel slot via a segmented control. Clicking a file opens a read-only preview in the center panel alongside the TerminalPanel.

### Scope Boundaries

- **In scope (v1):** Read-only browsing, git status colours, diff-stat badges, file preview, context menu actions, active files tracking
- **Out of scope (v1):** File editing, file creation/deletion, drag-and-drop, search/filter within tree, breadcrumbs, multi-file tabs, virtualization for 10k+ file trees

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

2. **Main process** — New IPC handlers in `src/main/ipc/filetree-handlers.ts`:
   - `filetree:listDir({ path })` → returns `FileEntry[]` (name, type, path, children lazy)
   - `filetree:getGitStatus({ repoPath })` → returns `Record<string, GitStatusEntry>` (status + diff stats)
   - `filetree:getFileContent({ path })` → returns `{ content, size, isBinary }`
   - `filetree:openInTerminal({ path })` → opens OS terminal at path via `shell.openPath()`
   - `filetree:revealInFileManager({ path })` → reveals file in OS file manager via `shell.showItemInFolder()` (Windows) or `shell.openPath()` (macOS/Linux)
   - `filetree:copyPath({ path, relative })` → copies path to clipboard via `clipboard.writeText()`

3. **Git integration** — Extends `src/main/git-operations.ts` with `getGitStatus()` and `getDiffStats()` using the existing `simple-git` dependency.

4. **Active Files** — A separate section at the top of the tree. Shows files modified in the last 30 seconds across all running agent sessions' CWDs. Polled every 5 seconds via `fs.stat()` on the active project path. If no files are active, the section is hidden entirely.

### Center Panel

Tab bar with "Terminal" and "File: <name>" tabs. Clicking a file in the tree opens/activates the File tab. File preview is read-only with syntax highlighting.

### Context Menu

Four actions, all via Electron `shell` APIs. Context menu is positioned at cursor location, clamped to viewport bounds.

- **Copy Path** — copies absolute path to clipboard
- **Copy Relative Path** — copies path relative to project root
- **Reveal in File Manager** — opens OS file manager at file location (`shell.showItemInFolder` on Windows, `shell.openPath` on macOS/Linux)
- **Open in Terminal** — opens OS default terminal at the file's parent directory via `shell.openPath()` (does NOT open a PiDash terminal tab)

### File Tree Root

The tree is rooted at the **active project's path** (from `activeProject.path`). All running agents inherit this as their CWD unless explicitly overridden. If no project is active, the tree shows an empty state: "Select a project to browse files".

### File Sorting

Files and directories are sorted alphabetically, with directories listed before files. Within each group, sorting is case-insensitive A–Z.

### Hidden Files

Dotfiles (files/directories starting with `.`) are **hidden by default**. A toggle button in the tree header ("Show Hidden") reveals them. The preference is remembered per-project in local state (not persisted across sessions in v1).

---

## Components

### `FileTreePanel` (new)

**File:** `renderer/src/components/dashboard/FileTreePanel.tsx`

Replaces FleetPanel in the left panel slot when "Files" tab is active.

**Structure:**

- **Header:** Segmented control ("Fleet" / "Files"), refresh button, show-hidden toggle, collapse button
- **Active Files section** (top): Flat list of recently-modified files with file icon, path, and relative time ("2m ago"). Clicking opens the file in the center preview. Hidden when no files are active.
- **Filter tabs** (below Active Files): All / Changed / Staged / Unstaged. Only visible when the project is a git repo. Switching filters re-queries git status (does not cache filtered results).
- **Directory tree** (main area): Lazy-loaded on expand. Each row shows:
  - Chevron (rotated when expanded)
  - Folder/file icon (git-status tinted, or neutral if not a git repo)
  - Name
  - Diff-stat badge (`+12 -4 *1`) for changed files/directories
- **Context menu** on right-click: Copy Path, Copy Relative Path, Reveal in File Manager, Open in Terminal

**Keyboard navigation:**

- `↑` / `↓` — navigate tree rows
- `Enter` — open selected file in preview
- `→` — expand selected directory
- `←` — collapse selected directory
- `Escape` — close context menu if open

### `FilePreview` (new)

**File:** `renderer/src/components/dashboard/FilePreview.tsx`

Lives in the center panel as a tab alongside TerminalPanel.

**Structure:**

- **Header:** File path (truncated if too long), file size, "Expand" button (opens fullscreen modal), close button (×)
- **Content:** Syntax-highlighted text with line numbers
- **Supports:**
  - **Text files** — syntax highlighted using `prismjs` (already available via existing dependencies). Language detected from file extension.
  - **Markdown** — toggle button in header switches between "Rendered" (HTML preview) and "Source" (syntax-highlighted raw text). Default: Rendered.
  - **Images** — zoomable with toolbar: Zoom Out, Fit to View, Zoom In, 100%. Zoom range: 25%–500% in 25% increments. Mouse wheel pinch-zoom supported.
  - **Binary/oversize** — fallback card with message and action buttons
- Read-only — no save button

**Expand modal:** Opens file preview in a fullscreen overlay with a darkened backdrop. Escape closes the modal.

### Tab Bar (modification to TerminalPanel area)

When a file is selected, the center panel shows a tab bar: "Terminal" | "File: filename.ts". Clicking "Terminal" returns to the terminal view. The file tab shows a close button (×) that returns to the terminal view.

Multiple file tabs not supported in v1 (single file preview slot). Opening a new file replaces the current file preview tab.

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
- **Performance note:** For projects with >5000 files, consider adding virtualized list rendering in v2. V1 renders all visible rows directly (no windowing).

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
- **Timeout:** Git status queries timeout after 10 seconds. If timeout occurs, fall back to neutral icons and log warning to main process console.

### Lazy load failure

- If a directory can't be read (permission denied), show "Permission denied" inline row under the directory
- Don't expand the directory

### Network/remote paths

- `fs.readdir` works normally; no special handling needed
- Git status may be slow; timeout applies (10 seconds)
- **Windows note:** `simple-git` works on Windows, but path separators in diff stats use forward slashes (`/`) regardless of OS for consistency

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

- **`prismjs`** — syntax highlighting for file preview. Check `package.json` for existing version. If not present, add `prismjs` and `@types/prismjs`.
- **`simple-git`** — already available for git operations
- No other new dependencies required

### IPC API (new)

```typescript
// Renderer → Main
filetree:listDir({ path: string }) → { entries: FileEntry[] }
filetree:getGitStatus({ repoPath: string }) → { status: Record<string, GitStatusEntry> }
filetree:getFileContent({ path: string }) → { content: string; size: number; isBinary: boolean }
filetree:copyPath({ path: string; relative: boolean }) → { success: boolean }
filetree:revealInFileManager({ path: string }) → { success: boolean }
filetree:openInTerminal({ path: string }) → { success: boolean }

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

### IPC Error Handling

- All IPC handlers wrap results in `{ success: boolean; error?: string }` for void operations
- Data-returning handlers throw on error; renderer catches and shows inline error state
- IPC timeout: 10 seconds for all filetree operations. Timeout returns `{ error: 'Operation timed out' }`
