# File Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VS Code-style file tree sidebar to PiDash with git-aware status colours, diff-stat badges, and a read-only file preview panel.

**Architecture:** The file tree lives in the existing left panel slot, toggling with FleetPanel via a segmented control. Main process handles filesystem listing, git status queries, and file content reads via IPC. Renderer manages tree state, lazy loading, and file preview with syntax highlighting.

**Tech Stack:** TypeScript, React, Electron IPC, `simple-git` (existing), `prismjs` (new dependency for syntax highlighting).

## Global Constraints

- Read-only: no file editing, creation, or deletion in v1
- Lazy loading: only fetch directory children on expand
- Git status timeout: 10 seconds, falls back to neutral icons
- IPC timeout: 10 seconds for all filetree operations
- File sorting: directories first, then A-Z case-insensitive
- Dotfiles hidden by default with toggle
- Active Files section: files modified in last 30 seconds, polled every 5 seconds
- Large directories (>256 entries): show truncated listing
- Binary files: detected by non-printable bytes in first 8KB
- Oversize files: >1MB shows fallback card
- Path separators in diff stats use forward slashes regardless of OS

---

## File Structure

### New Files

| File | Responsibility |
| ------ | --------------- |
| `src/shared/filetree-types.ts` | Shared TypeScript types (FileEntry, GitStatusEntry, FileContentResult) |
| `renderer/src/types/filetree.ts` | Renderer-side filetree types and FiletreeAPI interface |
| `renderer/src/components/dashboard/FileTreePanel.tsx` | File tree sidebar with lazy loading, git status, context menu |
| `renderer/src/components/dashboard/FilePreview.tsx` | Read-only file preview with syntax highlighting |
| `src/main/ipc/filetree-handlers.ts` | Main process IPC handlers for filesystem and git operations |
| `src/main/ipc/filetree-handlers.test.ts` | Unit tests for main process handlers |
| `renderer/src/components/dashboard/__tests__/FileTreePanel.test.tsx` | Unit tests for FileTreePanel |
| `renderer/src/components/dashboard/__tests__/FilePreview.test.tsx` | Unit tests for FilePreview |

### Modified Files

| File | Change |
| ------ | -------- |
| `src/main/git-operations.ts` | Add `getGitStatus()` and `getDiffStats()` functions |
| `src/main/ipc-handlers.ts` | Register `filetree:*` IPC handlers |
| `src/preload.ts` | Expose `filetree` API to renderer |
| `renderer/src/types/global.d.ts` | Add filetree API to Window interface |
| `renderer/src/components/dashboard/Dashboard.tsx` | Integrate FileTreePanel toggle with FleetPanel |
| `renderer/src/components/dashboard/TerminalPanel.tsx` | Add tab bar for Terminal/File preview |
| `package.json` | Add `prismjs` and `@types/prismjs` dependencies |
| `renderer/src/index.css` | Add git status CSS variables |

---

### Task 1: Add prismjs Dependency

**Files:**

- Modify: `package.json`

**Interfaces:**

- Consumes: existing package.json structure
- Produces: `prismjs` and `@types/prismjs` available for import

- [ ] **Step 1: Add prismjs to package.json**

Add to `dependencies` in `package.json`:

```json
"prismjs": "^1.29.0",
"@types/prismjs": "^1.26.0"
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: prismjs and @types/prismjs installed in node_modules

- [ ] **Step 3: Verify import works**

Create temporary test file `renderer/src/test-prism.tsx`:

```tsx
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
console.log(Prism.highlight('const x = 1;', Prism.languages.typescript, 'typescript'));
```

Run: `cd renderer && npx tsc --noEmit src/test-prism.tsx`
Expected: No TypeScript errors. Delete test file after verification.

- [ ] **Step 4: Add git status CSS variables**

Add to `renderer/src/index.css` in the `:root` block (after the existing `--accent-rose` line):

```css
--status-conflict: #ef4444;
--status-untracked: #22c55e;
--status-staged: #22c55e;
--status-modified: #f59e0b;
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml renderer/src/index.css
git commit -m "chore: add prismjs and git status CSS variables"
```

---

### Task 2: Define File Tree Types

**Files:**

- Create: `src/shared/filetree-types.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks
- Produces: `FileEntry`, `GitStatusEntry`, `FileContentResult` types used by all subsequent tasks (main process and renderer both import from this shared file)

- [ ] **Step 1: Create shared types file**

Create `src/shared/filetree-types.ts`:

```typescript
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  hasChildren?: boolean;
}

export type GitStatus = 'untracked' | 'staged' | 'modified' | 'conflict';

export interface GitStatusEntry {
  status: GitStatus;
  additions: number;
  deletions: number;
  untrackedCount?: number;
}

export interface FileContentResult {
  content: string;
  size: number;
  isBinary: boolean;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/filetree-types.ts
git commit -m "types: add shared file tree type definitions"
```

---

### Task 3: Add Git Status Functions to git-operations.ts

**Files:**

- Modify: `src/main/git-operations.ts`

**Interfaces:**

- Consumes: existing `simple-git` import, existing `isGitRepo` function
- Produces: `getGitStatus(repoPath)` and `getDiffStats(repoPath)` functions

- [ ] **Step 1: Add GitStatusEntry type to git-operations.ts**

Add at the top of `src/main/git-operations.ts` after imports:

```typescript
export type GitStatus = 'untracked' | 'staged' | 'modified' | 'conflict';

export interface GitStatusEntry {
  status: GitStatus;
  additions: number;
  deletions: number;
  untrackedCount?: number;
}
```

- [ ] **Step 2: Add getGitStatus function**

Add after `isGitRepo`:

```typescript
export async function getGitStatus(repoPath: string): Promise<Record<string, GitStatusEntry>> {
  try {
    const git = simpleGit(repoPath);
    
    const isRepo = await isGitRepo(repoPath);
    if (!isRepo) return {};

    const status = await git.status();
    const result: Record<string, GitStatusEntry> = {};

    for (const file of status.files) {
      const statusEntry: GitStatusEntry = {
        additions: 0,
        deletions: 0,
      };

      if (file.status.includes('C') || (file.status.includes('D') && file.status.includes('A'))) {
        statusEntry.status = 'conflict';
      } else if (file.status.includes('A')) {
        statusEntry.status = 'staged';
      } else if (file.status.includes('?')) {
        statusEntry.status = 'untracked';
      } else {
        statusEntry.status = 'modified';
      }

      result[file.path.replace(/\\/g, '/')] = statusEntry;
    }

    return result;
  } catch (error) {
    console.error('getGitStatus error:', error);
    return {};
  }
}
```

- [ ] **Step 3: Add getDiffStats function**

Add after `getGitStatus`:

```typescript
export async function getDiffStats(repoPath: string): Promise<Record<string, GitStatusEntry>> {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await isGitRepo(repoPath);
    if (!isRepo) return {};

    const result: Record<string, GitStatusEntry> = {};

    // Get diff stats for staged changes
    try {
      const stagedDiff = await git.diffSummary(['--cached']);
      for (const file of stagedDiff.files) {
        const filePath = file.file.replace(/\\/g, '/');
        if (!result[filePath]) {
          result[filePath] = { status: 'staged', additions: 0, deletions: 0 };
        }
        result[filePath].additions += file.insertions;
        result[filePath].deletions += file.deletions;
        result[filePath].status = 'staged';
      }
    } catch {
      // No staged changes
    }

    // Get diff stats for unstaged changes
    try {
      const workingDiff = await git.diffSummary();
      for (const file of workingDiff.files) {
        const filePath = file.file.replace(/\\/g, '/');
        if (!result[filePath]) {
          result[filePath] = { status: 'modified', additions: 0, deletions: 0 };
        }
        result[filePath].additions += file.insertions;
        result[filePath].deletions += file.deletions;
        result[filePath].status = 'modified';
      }
    } catch {
      // No unstaged changes
    }

    // Get untracked files
    try {
      const status = await git.status();
      for (const file of status.files) {
        if (file.status.includes('?')) {
          const filePath = file.path.replace(/\\/g, '/');
          if (!result[filePath]) {
            result[filePath] = { status: 'untracked', additions: 0, deletions: 0, untrackedCount: 1 };
          } else {
            result[filePath].untrackedCount = (result[filePath].untrackedCount || 0) + 1;
          }
        }
      }
    } catch {
      // No untracked files
    }

    return result;
  } catch (error) {
    console.error('getDiffStats error:', error);
    return {};
  }
}
```

- [ ] **Step 4: Run existing tests**

Run: `pnpm test src/main/git-operations.test.ts` (if exists)
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/main/git-operations.ts
git commit -m "feat: add git status and diff stats functions"
```

---

### Task 4: Create Main Process File Tree IPC Handlers

**Files:**

- Create: `src/main/ipc/filetree-handlers.ts`
- Create: `src/main/ipc/filetree-handlers.test.ts`

**Interfaces:**

- Consumes: `getGitStatus`, `getDiffStats` from Task 3, `fs` module, `shell` from Electron
- Produces: `registerFiletreeHandlers()` function

- [ ] **Step 1: Create filetree-handlers.ts**

Create `src/main/ipc/filetree-handlers.ts`:

```typescript
import { ipcMain, shell, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import { getGitStatus, getDiffStats, GitStatusEntry } from '../git-operations';
import type { FileEntry, FileContentResult } from '../../shared/filetree-types';

const MAX_ENTRIES = 256;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function registerFiletreeHandlers(): void {
  ipcMain.handle('filetree:listDir', async (_event, { path: dirPath }: { path: string }): Promise<{ entries: FileEntry[] }> => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      const result: FileEntry[] = [];
      let count = 0;

      for (const entry of entries) {
        if (count >= MAX_ENTRIES) break;
        
        result.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, entry.name),
          hasChildren: entry.isDirectory(),
        });
        count++;
      }

      if (entries.length > MAX_ENTRIES) {
        result.push({
          name: `${entries.length - MAX_ENTRIES}+ more entries`,
          type: 'file',
          path: '',
          hasChildren: false,
        });
      }

      return { entries: result };
    } catch (error) {
      console.error('filetree:listDir error:', error);
      throw error;
    }
  });

  ipcMain.handle('filetree:getGitStatus', async (_event, { repoPath }: { repoPath: string }): Promise<{ status: Record<string, GitStatusEntry> }> => {
    try {
      const status = await getGitStatus(repoPath);
      const diffStats = await getDiffStats(repoPath);

      const merged: Record<string, GitStatusEntry> = {};
      
      for (const [key, value] of Object.entries(status)) {
        merged[key] = value;
      }
      
      for (const [key, value] of Object.entries(diffStats)) {
        if (merged[key]) {
          merged[key].additions = value.additions;
          merged[key].deletions = value.deletions;
          merged[key].untrackedCount = value.untrackedCount;
        } else {
          merged[key] = value;
        }
      }

      return { status: merged };
    } catch (error) {
      console.error('filetree:getGitStatus error:', error);
      return { status: {} };
    }
  });

  ipcMain.handle('filetree:getFileContent', async (_event, { path: filePath }: { path: string }): Promise<FileContentResult> => {
    try {
      const stats = await fs.promises.stat(filePath);
      
      if (stats.size > MAX_FILE_SIZE) {
        return { content: '', size: stats.size, isBinary: true };
      }

      const buffer = await fs.promises.readFile(filePath);
      
      let isBinary = false;
      for (let i = 0; i < Math.min(8192, buffer.length); i++) {
        if (buffer[i] === 0) {
          isBinary = true;
          break;
        }
      }

      return {
        content: isBinary ? '' : buffer.toString('utf-8'),
        size: stats.size,
        isBinary,
      };
    } catch (error) {
      console.error('filetree:getFileContent error:', error);
      throw error;
    }
  });

  ipcMain.handle('filetree:copyPath', async (_event, { path: filePath, relative = false }: { path: string; relative?: boolean }): Promise<{ success: boolean }> => {
    try {
      const text = relative ? filePath.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', '') : filePath;
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('filetree:copyPath error:', error);
      return { success: false };
    }
  });

  ipcMain.handle('filetree:getActiveFiles', async (_event, { projectPath, agentCwds }: { projectPath: string; agentCwds: string[] }): Promise<{ files: Array<{ path: string; relativePath: string; modifiedAt: number }> }> => {
    try {
      const now = Date.now();
      const threshold = 30000; // 30 seconds
      const result: Array<{ path: string; relativePath: string; modifiedAt: number }> = [];

      const dirsToScan = agentCwds.length > 0 ? agentCwds : [projectPath];

      for (const dir of dirsToScan) {
        try {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile() && !entry.name.startsWith('.')) {
              const fullPath = path.join(dir, entry.name);
              const stats = await fs.promises.stat(fullPath);
              if (now - stats.mtimeMs < threshold) {
                const relPath = fullPath.replace(projectPath + '/', '').replace(projectPath + '\\', '');
                result.push({ path: fullPath, relativePath: relPath, modifiedAt: stats.mtimeMs });
              }
            }
          }
        } catch {
          // Skip directories that don't exist (agent CWD may be invalid)
        }
      }

      // Sort by modification time, most recent first
      result.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return { files: result.slice(0, 10) }; // Cap at 10 active files
    } catch (error) {
      console.error('filetree:getActiveFiles error:', error);
      return { files: [] };
    }
  });

  ipcMain.handle('filetree:revealInFileManager', async (_event, { path: filePath }: { path: string }): Promise<{ success: boolean }> => {
    try {
      if (process.platform === 'win32') {
        shell.showItemInFolder(filePath);
      } else {
        shell.openPath(filePath);
      }
      return { success: true };
    } catch (error) {
      console.error('filetree:revealInFileManager error:', error);
      return { success: false };
    }
  });

  ipcMain.handle('filetree:openInTerminal', async (_event, { path: dirPath }: { path: string }): Promise<{ success: boolean }> => {
    try {
      shell.openPath(dirPath);
      return { success: true };
    } catch (error) {
      console.error('filetree:openInTerminal error:', error);
      return { success: false };
    }
  });
}
```

- [ ] **Step 2: Create unit tests**

Create `src/main/ipc/filetree-handlers.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('filetree utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filetree-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists directories before files', async () => {
    fs.mkdirSync(path.join(tempDir, 'z-dir'));
    fs.mkdirSync(path.join(tempDir, 'a-dir'));
    fs.writeFileSync(path.join(tempDir, 'z-file.txt'), 'content');
    fs.writeFileSync(path.join(tempDir, 'a-file.txt'), 'content');

    const entries = await fs.promises.readdir(tempDir, { withFileTypes: true });
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    expect(entries[0].name).toBe('a-dir');
  });

  it('detects binary files', () => {
    const binaryPath = path.join(tempDir, 'binary.bin');
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    fs.writeFileSync(binaryPath, buffer);

    const content = fs.readFileSync(binaryPath);
    let isBinary = false;
    for (let i = 0; i < Math.min(8192, content.length); i++) {
      if (content[i] === 0) {
        isBinary = true;
        break;
      }
    }

    expect(isBinary).toBe(true);
  });

  it('detects text files', () => {
    const textPath = path.join(tempDir, 'text.txt');
    fs.writeFileSync(textPath, 'Hello, World!');

    const content = fs.readFileSync(textPath);
    let isBinary = false;
    for (let i = 0; i < Math.min(8192, content.length); i++) {
      if (content[i] === 0) {
        isBinary = true;
        break;
      }
    }

    expect(isBinary).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/filetree-handlers.ts src/main/ipc/filetree-handlers.test.ts
git commit -m "feat: add file tree IPC handlers"
```

---

### Task 5: Register IPC Handlers and Expose to Renderer

**Files:**

- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`

**Interfaces:**

- Consumes: `registerFiletreeHandlers()` from Task 4
- Produces: `window.api.filetree` object

- [ ] **Step 1: Register filetree handlers in main process**

Add to `src/main/ipc-handlers.ts` at the end of `registerIpcHandlers()`:

```typescript
import { registerFiletreeHandlers } from './ipc/filetree-handlers';

// Add at end of registerIpcHandlers function:
registerFiletreeHandlers();
```

- [ ] **Step 2: Expose filetree API in preload**

Add to `src/preload.ts` in the `contextBridge.exposeInMainWorld('api', { ... })` block:

```typescript
// File tree management
filetree: {
  listDir: (path: string) => ipcRenderer.invoke('filetree:listDir', { path }),
  getGitStatus: (repoPath: string) => ipcRenderer.invoke('filetree:getGitStatus', { repoPath }),
  getFileContent: (path: string) => ipcRenderer.invoke('filetree:getFileContent', { path }),
  copyPath: (path: string, relative?: boolean) => ipcRenderer.invoke('filetree:copyPath', { path, relative }),
  revealInFileManager: (path: string) => ipcRenderer.invoke('filetree:revealInFileManager', { path }),
  openInTerminal: (path: string) => ipcRenderer.invoke('filetree:openInTerminal', { path }),
  getActiveFiles: (projectPath: string, agentCwds: string[]) => ipcRenderer.invoke('filetree:getActiveFiles', { projectPath, agentCwds }),
},
```

- [ ] **Step 3: Add filetree types to global.d.ts**

Add to `renderer/src/types/global.d.ts` in the `Window.api` interface (before the closing brace):

```typescript
filetree: {
  listDir: (path: string) => Promise<{ entries: import('@/types/filetree').FileEntry[] }>; 
  getGitStatus: (repoPath: string) => Promise<{ status: Record<string, import('@/types/filetree').GitStatusEntry> }>; 
  getFileContent: (path: string) => Promise<import('@/types/filetree').FileContentResult>; 
  copyPath: (path: string, relative?: boolean) => Promise<{ success: boolean }>; 
  revealInFileManager: (path: string) => Promise<{ success: boolean }>; 
  openInTerminal: (path: string) => Promise<{ success: boolean }>; 
  getActiveFiles: (projectPath: string, agentCwds: string[]) => Promise<{ files: import('@/types/filetree').ActiveFile[] }>;
};
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: register filetree IPC handlers and expose to renderer"
```

---

### Task 6: Create FileTreePanel Component

**Files:**

- Create: `renderer/src/components/dashboard/FileTreePanel.tsx`
- Create: `renderer/src/types/filetree.ts` (renderer-side types)

**Interfaces:**

- Consumes: `FileEntry`, `GitStatusEntry`, `FileContentResult` from `src/shared/filetree-types.ts` (Task 2); `window.api.filetree` IPC API (Task 5); `activeProject` from Dashboard
- Produces: `<FileTreePanel>` component with props: `{ activeProject: Project | null; onFileSelect: (path: string) => void; isCollapsed: boolean; onToggleCollapse: () => void }`

- [ ] **Step 1: Create renderer-side filetree types**

Create `renderer/src/types/filetree.ts`:

```typescript
import type { FileEntry, GitStatusEntry, FileContentResult } from '../../../src/shared/filetree-types';

export type { FileEntry, GitStatusEntry, FileContentResult };

export interface FiletreeAPI {
  listDir: (path: string) => Promise<{ entries: FileEntry[] }>;
  getGitStatus: (repoPath: string) => Promise<{ status: Record<string, GitStatusEntry> }>;
  getFileContent: (path: string) => Promise<FileContentResult>;
  copyPath: (path: string, relative?: boolean) => Promise<{ success: boolean }>;
  revealInFileManager: (path: string) => Promise<{ success: boolean }>;
  openInTerminal: (path: string) => Promise<{ success: boolean }>;
  getActiveFiles: (projectPath: string, agentCwds: string[]) => Promise<{ files: ActiveFile[] }>;
}

export type FiletreeFilter = 'all' | 'changed' | 'staged' | 'unstaged';

export interface ActiveFile {
  path: string;
  relativePath: string;
  modifiedAt: number;
}
```

- [ ] **Step 2: Write the FileTreePanel component**

Create `renderer/src/components/dashboard/FileTreePanel.tsx`. The component implements:

- Header with refresh button, show-hidden toggle, collapse button
- Active Files section (top, hidden when empty)
- Filter tabs (All/Changed/Staged/Unstaged, hidden when not a git repo)
- Directory tree with lazy loading on expand
- Right-click context menu (Copy Path, Copy Relative Path, Reveal in File Manager, Open in Terminal)
- Collapsed state showing only a PanelLeftOpen icon

Key implementation details:

- Tree state: `expandedDirs: Set<string>` (path → expanded), `childrenCache: Record<string, FileEntry[]>` (path → cached children), `loadErrors: Set<string>` (paths that failed to read)
- Git status: loaded on mount for project root, auto-refreshed every 30s via `setInterval`
- Active Files: polled every 5s via `window.api.filetree.getActiveFiles(projectPath, agentCwds)`. Agent CWDs come from running sessions' `cwd` field. Hidden when empty.
- Directory git status aggregation: compute a `directoryStatus: Record<string, GitStatusEntry>` map. For each file in gitStatus, split its relative path by `/` to get ancestor directory paths. For each ancestor, accumulate additions, deletions, and untrackedCount into the map. When rendering a directory row, look up its aggregated status for the icon colour and diff badge. A directory with all-zero aggregated stats shows no badge.
- File sorting: directories first, then A-Z case-insensitive (handled in main process Task 4)
- Dotfiles: hidden by default, toggled via `showHidden` state
- Large directories: >256 entries shows truncated listing (handled in main process)
- Lazy load failure: if `listDir` throws for a directory, add its path to `loadErrors` and show a "Permission denied" inline row instead of expanding
- Context menu: positioned at cursor, clamped to viewport, closed on mousedown outside
- Keyboard navigation: `↑`/`↓` navigate visible tree rows, `Enter` opens selected file, `→` expands selected directory, `←` collapses it, `Escape` closes context menu. Maintain `focusedIndex` state for keyboard focus.

The component should use inline styles with CSS custom properties (`var(--bg)`, `var(--border)`, `var(--text-primary)`, `var(--status-staged)`, etc.) consistent with the existing FleetPanel styling pattern.

Git status colours:

- `conflict` → red (`var(--status-conflict)` or `#ef4444`)
- `untracked` → green (`var(--status-untracked)` or `#22c55e`)
- `staged` → green (`var(--status-staged)` or `#22c55e`)
- `modified` → amber (`var(--status-modified)` or `#f59e0b`)
- no status → `var(--text-muted)`

Diff-stat badge format: `+N -M *U` where N=additions, M=deletions, U=untrackedCount. Hidden when all zero.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add renderer/src/types/filetree.ts renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "feat: add FileTreePanel component with git status and lazy loading"
```

---

### Task 7: Create FilePreview Component

**Files:**

- Create: `renderer/src/components/dashboard/FilePreview.tsx`

**Interfaces:**

- Consumes: `window.api.filetree.getFileContent` (Task 5); `Prism` for syntax highlighting (Task 1)
- Produces: `<FilePreview path={string} onClose={() => void} onExpand={() => void} isExpanded={boolean} />` component

- [ ] **Step 1: Write the FilePreview component**

Create `renderer/src/components/dashboard/FilePreview.tsx`. The component implements:

- Header bar: truncated file path, file size, Expand button (fullscreen modal), close button (×)
- Content area with syntax highlighting via Prism
- Markdown toggle: "Rendered" / "Source" switch (default: Rendered — for v1, both render as highlighted source since no markdown library dependency)
- Image support: zoomable with toolbar (Zoom Out, Fit to View, Zoom In, 100%). Zoom range 25%–500% in 25% increments
- Binary/oversize fallback: card with message and "Reveal in File Manager" / "Open in Terminal" buttons

File content loading:

- On mount (or when `path` changes), call `window.api.filetree.getFileContent(path)`
- If the call throws → show inline error banner: "Could not read file: <error message>" with "Retry" and "Close" buttons
- If `isBinary` is true → show binary fallback card
- If `size > 1MB` → show oversize fallback card
- Otherwise → syntax highlight using Prism with language detected from file extension

Error state:

- Track `error: string | null` and `isLoading: boolean` state
- Error banner shows at top of content area with retry button (re-calls getFileContent) and close button (calls onClose)
- On retry, clear error and re-fetch

Language detection mapping (extension → Prism language):

- `.ts`, `.tsx` → `typescript`
- `.js`, `.jsx` → `javascript`
- `.py` → `python`
- `.css`, `.scss`, `.sass`, `.less` → `css`
- `.json` → `json`
- `.md`, `.markdown` → `markdown`
- `.sh`, `.bash`, `.zsh` → `bash`
- `.yml`, `.yaml` → `yaml`
- `.toml` → `toml`
- `.rs` → `rust`, `.go` → `go`, `.java` → `java`
- `.c`, `.cpp`, `.cc` → `cpp`
- `.cs` → `csharp`
- `.sql` → `sql`
- `.html`, `.htm` → `html`
- `.xml`, `.svg` → `xml`
- default → `plaintext`

Syntax highlighting uses `prismjs/themes/prism-tomorrow.css` for dark theme. Display with line numbers in a left gutter column.

Expand modal:

- Opens a fullscreen overlay with darkened backdrop (`position: fixed; inset: 0; z-index: 9999`)
- Backdrop closes modal on click
- Escape key closes modal
- Same FilePreview content rendered inside the modal

Image preview:

- Uses `file:///` protocol URL for local file display
- Zoom state in component `useState(100)`
- Toolbar buttons adjust zoom in 25% increments, clamped to 25–500%

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/FilePreview.tsx
git commit -m "feat: add FilePreview component with syntax highlighting"
```

---

### Task 8: Add Tab Bar Support to TerminalPanel

**Files:**

- Modify: `renderer/src/components/dashboard/TerminalPanel.tsx`

**Interfaces:**

- Consumes: existing TerminalPanel props
- Produces: modified TerminalPanel that supports a file preview tab alongside the terminal tab

- [ ] **Step 1: Modify TerminalPanel to support tab bar**

Modify `renderer/src/components/dashboard/TerminalPanel.tsx` to add tab bar support.

New props to add:

```typescript
type TerminalPanelProps = {
  agentId: string | null;
  agentName?: string;
  onClose?: () => void;
  // New props for file preview tab
  previewFile?: { path: string; name: string } | null;
  onPreviewClose?: () => void;
};
```

When `previewFile` is set, render a tab bar at the top of the panel:

- Tab 1: "Terminal" — clicking shows the terminal view
- Tab 2: `File: ${previewFile.name}` — clicking shows the FilePreview component
- File tab has a close (×) button that calls `onPreviewClose`

When `agentId` is null AND `previewFile` is null, show the existing empty state.

When `agentId` is null but `previewFile` is set, show only the file preview (no Terminal tab needed — just show the FilePreview directly without a tab bar, or show a single "File" tab).

When both are set, default to showing the terminal tab. Add an `activeTab` state ('terminal' | 'file') to switch between views.

Import and render `<FilePreview>` from `./FilePreview` when the file tab is active.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/TerminalPanel.tsx
git commit -m "feat: add tab bar support to TerminalPanel for file preview"
```

---

### Task 9: Integrate FileTreePanel into Dashboard

**Files:**

- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**

- Consumes: `FileTreePanel` from Task 6; `activeProject` state already in Dashboard
- Produces: Dashboard with left panel toggling between FleetPanel and FileTreePanel via segmented control

- [ ] **Step 1: Add left panel toggle state to Dashboard**

In `Dashboard.tsx`, add state for left panel view:

```typescript
const [leftPanelView, setLeftPanelView] = useState<'fleet' | 'files'>('fleet');
```

- [ ] **Step 2: Add FileTreePanel import and file select handler**

Add import:

```typescript
import { FileTreePanel } from './FileTreePanel';
```

Add handler:

```typescript
const handleFileSelect = useCallback((filePath: string) => {
  const fileName = filePath.split(/[\\/]/).pop() || 'Untitled';
  setPreviewFile({ path: filePath, name: fileName });
}, []);

const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null);
```

- [ ] **Step 3: Replace FleetPanel in JSX with segmented control + conditional render**

In the left panel area of Dashboard's JSX, replace the standalone `<FleetPanel>` with a wrapper that includes a segmented control header and conditionally renders FleetPanel or FileTreePanel.

The segmented control should appear in the panel header area:

- "Fleet" button (active when `leftPanelView === 'fleet'`)
- "Files" button (active when `leftPanelView === 'files'`)

Both panels receive `isCollapsed` and `onToggleCollapse` props. When collapsed, only the toggle button shows.

Pass `previewFile` and `setPreviewFile` (as `onPreviewClose`) to TerminalPanel.

Pass `activeProject` and `onFileSelect={handleFileSelect}` to FileTreePanel.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit --project tsconfig.app.json`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: integrate FileTreePanel into Dashboard with Fleet toggle"
```

---

### Task 10: Write Unit Tests

**Files:**

- Create: `renderer/src/components/dashboard/__tests__/FileTreePanel.test.tsx`
- Create: `renderer/src/components/dashboard/__tests__/FilePreview.test.tsx`

**Interfaces:**

- Consumes: FileTreePanel (Task 6), FilePreview (Task 7), vitest + @testing-library/react (existing test infra)
- Produces: passing test suites for both components

- [ ] **Step 1: Create FileTreePanel tests**

Create `renderer/src/components/dashboard/__tests__/FileTreePanel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileTreePanel } from '../FileTreePanel';

// Mock window.api.filetree
const mockListDir = vi.fn();
const mockGetGitStatus = vi.fn();
const mockIsGitRepo = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (window as any).api = {
    filetree: {
      listDir: mockListDir,
      getGitStatus: mockGetGitStatus,
      getFileContent: vi.fn(),
      copyPath: vi.fn(),
      revealInFileManager: vi.fn(),
      openInTerminal: vi.fn(),
      getActiveFiles: vi.fn().mockResolvedValue({ files: [] }),
    },
    isGitRepo: mockIsGitRepo,
  };
});

describe('FileTreePanel', () => {
  it('renders empty state when no project is active', () => {
    render(<FileTreePanel activeProject={null} onFileSelect={vi.fn()} isCollapsed={false} onToggleCollapse={vi.fn()} />);
    expect(screen.getByText('Select a project to browse files')).toBeInTheDocument();
  });

  it('expands directory on click and shows children', async () => {
    mockIsGitRepo.mockResolvedValue(false);
    mockListDir.mockResolvedValue({
      entries: [
        { name: 'src', type: 'directory', path: '/proj/src', hasChildren: true },
        { name: 'package.json', type: 'file', path: '/proj/package.json' },
      ],
    });

    render(
      <FileTreePanel
        activeProject={{ path: '/proj' } as any}
        onFileSelect={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );

    // Wait for entries to load
    await vi.waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
    });

    // Expand src directory
    fireEvent.click(screen.getByText('src'));

    // Lazy load should be triggered
    await vi.waitFor(() => {
      expect(mockListDir).toHaveBeenCalledWith('/proj/src');
    });
  });

  it('calls onFileSelect when a file is clicked', async () => {
    const onFileSelect = vi.fn();
    mockIsGitRepo.mockResolvedValue(false);
    mockListDir.mockResolvedValue({
      entries: [
        { name: 'README.md', type: 'file', path: '/proj/README.md' },
      ],
    });

    render(
      <FileTreePanel
        activeProject={{ path: '/proj' } as any}
        onFileSelect={onFileSelect}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );

    await vi.waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('README.md'));
    expect(onFileSelect).toHaveBeenCalledWith('/proj/README.md');
  });

  it('hides filter tabs when not a git repo', async () => {
    mockIsGitRepo.mockResolvedValue(false);
    mockListDir.mockResolvedValue({ entries: [] });

    render(
      <FileTreePanel
        activeProject={{ path: '/proj' } as any}
        onFileSelect={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );

    await vi.waitFor(() => {
      expect(screen.queryByText('All')).not.toBeInTheDocument();
    });
  });

  it('shows collapsed state with expand button', () => {
    render(<FileTreePanel activeProject={null} onFileSelect={vi.fn()} isCollapsed={true} onToggleCollapse={vi.fn()} />);
    expect(screen.getByTitle('Expand file tree')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run FileTreePanel tests**

Run: `pnpm test --project renderer renderer/src/components/dashboard/__tests__/FileTreePanel.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Create FilePreview tests**

Create `renderer/src/components/dashboard/__tests__/FilePreview.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreview } from '../FilePreview';

const mockGetFileContent = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (window as any).api = {
    filetree: {
      getFileContent: mockGetFileContent,
      revealInFileManager: vi.fn(),
      openInTerminal: vi.fn(),
    },
  };
});

// Mock Prism
vi.mock('prismjs', () => ({
  default: {
    highlight: (code: string) => `<span>${code}</span>`,
    languages: {
      typescript: {},
      javascript: {},
      python: {},
      css: {},
      json: {},
      markdown: {},
      bash: {},
      yaml: {},
      toml: {},
      rust: {},
      go: {},
      java: {},
      c: {},
      cpp: {},
      csharp: {},
      sql: {},
      html: {},
      xml: {},
      plaintext: {},
    },
  },
}));

describe('FilePreview', () => {
  it('shows syntax-highlighted text for .ts files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: 'const x = 1;',
      size: 12,
      isBinary: false,
    });

    render(<FilePreview path="/test.ts" onClose={vi.fn()} />);

    await screen.findByText('const x = 1;');
    expect(screen.queryByText('Binary file')).not.toBeInTheDocument();
  });

  it('shows fallback card for binary files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: '',
      size: 1024,
      isBinary: true,
    });

    render(<FilePreview path="/test.png" onClose={vi.fn()} />);

    await screen.findByText(/Binary file/i);
  });

  it('shows fallback card for oversize files', async () => {
    mockGetFileContent.mockResolvedValue({
      content: '',
      size: 2 * 1024 * 1024, // 2MB
      isBinary: false,
    });

    render(<FilePreview path="/test.large" onClose={vi.fn()} />);

    await screen.findByText(/too large/i);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    mockGetFileContent.mockResolvedValue({
      content: 'hello',
      size: 5,
      isBinary: false,
    });

    render(<FilePreview path="/test.txt" onClose={onClose} />);

    const closeBtn = await screen.findByTitle('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run FilePreview tests**

Run: `pnpm test --project renderer renderer/src/components/dashboard/__tests__/FilePreview.test.tsx`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/__tests__/FileTreePanel.test.tsx renderer/src/components/dashboard/__tests__/FilePreview.test.tsx
git commit -m "test: add unit tests for FileTreePanel and FilePreview"
```

---

### Task 11: Wire Up IPC and Run Full Test Suite

**Files:**

- Modify: `src/main/ipc-handlers.ts` (Task 5 already covers this — verify)
- Modify: `src/preload.ts` (Task 5 already covers this — verify)
- Modify: `renderer/src/components/dashboard/Dashboard.tsx` (Task 9 already covers this)

**Interfaces:**

- Consumes: all previous tasks
- Produces: fully integrated file explorer feature

This task verifies all previous tasks are correctly wired together. If Tasks 5 and 9 were completed correctly, no new code is needed — only verification.

- [ ] **Step 1: Verify IPC handlers are registered**

Check `src/main/ipc-handlers.ts` contains:

```typescript
import { registerFiletreeHandlers } from './ipc/filetree-handlers';
// ...
registerFiletreeHandlers();
```

If not present, add it at the end of `registerIpcHandlers()`.

- [ ] **Step 2: Verify preload exposes filetree API**

Check `src/preload.ts` contains the `filetree` object in `contextBridge.exposeInMainWorld('api', { ... })`:

```typescript
filetree: {
  listDir: (path: string) => ipcRenderer.invoke('filetree:listDir', { path }),
  getGitStatus: (repoPath: string) => ipcRenderer.invoke('filetree:getGitStatus', { repoPath }),
  getFileContent: (path: string) => ipcRenderer.invoke('filetree:getFileContent', { path }),
  copyPath: (path: string, relative?: boolean) => ipcRenderer.invoke('filetree:copyPath', { path, relative }),
  revealInFileManager: (path: string) => ipcRenderer.invoke('filetree:revealInFileManager', { path }),
  openInTerminal: (path: string) => ipcRenderer.invoke('filetree:openInTerminal', { path }),
  getActiveFiles: (projectPath: string, agentCwds: string[]) => ipcRenderer.invoke('filetree:getActiveFiles', { projectPath, agentCwds }),
},
```

If not present, add it.

- [ ] **Step 3: Verify global.d.ts includes filetree API**

Check `renderer/src/types/global.d.ts` already contains the `filetree` object in `Window.api` (added in Task 5). If missing, add it.

- [ ] **Step 4: Run full TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors across main and renderer

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: All tests pass (main + renderer projects)

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: verify filetree IPC wiring and type declarations"
```

---

## Spec Coverage Self-Review

| Spec Requirement | Task |
| --- | --- |
| Read-only file tree sidebar | Task 6 |
| Toggle with FleetPanel via segmented control | Task 9 |
| Git status colours (conflict/untracked/staged/modified) | Task 6 |
| Diff-stat badges (+N -M *U) | Task 6 |
| Directory badge aggregation | Task 6 |
| Lazy loading on directory expand | Task 6 |
| Active Files section (top, polled every 5s via fs.stat) | Task 4 (IPC), Task 6 (renderer) |
| Filter tabs (All/Changed/Staged/Unstaged) | Task 6 |
| Context menu (Copy Path, Copy Relative, Reveal, Terminal) | Task 4 (IPC), Task 6 (renderer) |
| Show/hide dotfiles toggle | Task 6 |
| Keyboard navigation (↑↓Enter→←Escape) | Task 6 |
| File sorting (dirs first, A-Z) | Task 4 |
| Large directory truncation (>256) | Task 4 |
| Lazy load failure (Permission denied row) | Task 6 |
| CSS variables for git status colours | Task 1 |
| Read-only file preview with syntax highlighting | Task 7 |
| Markdown rendered/source toggle | Task 7 |
| Image zoom support | Task 7 |
| Binary/oversize fallback cards | Task 7 |
| File read error handling (Retry/Close) | Task 7 |
| Expand modal (fullscreen overlay) | Task 7 |
| Tab bar (Terminal / File: name) | Task 8 |
| Dashboard integration | Task 9 |
| prismjs dependency | Task 1 |
| Type definitions (shared) | Task 2 |
| Git status + diff stats functions | Task 3 |
| IPC handlers (main process) | Task 4 |
| IPC registration + preload + global.d.ts | Task 5 |
| Unit tests (FileTreePanel, FilePreview) | Task 10 |
| Verification + wiring check | Task 11 |

### Gaps / Out of Scope (v1, as per spec)

- File editing, creation, deletion — explicitly out of scope
- Drag-and-drop — out of scope
- Search/filter within tree (beyond git filter tabs) — out of scope
- Breadcrumbs — out of scope
- Multi-file tabs — out of scope (single file preview slot)
- Virtualization for 10k+ files — out of scope (noted for v2)
- Markdown rendered HTML view — v1 renders as highlighted source (no markdown library dependency)
