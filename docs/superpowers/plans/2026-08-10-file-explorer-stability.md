# File Explorer Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the file explorer with race condition fixes, path validation, real-time file watching, virtualization, and error boundaries.

**Architecture:** Pattern-first approach — introduce three shared utilities (AbortableIPC, pathValidator, FileWatcherService), then apply them systematically to handlers and components. All changes are additive or internal; no breaking changes to IPC APIs or component interfaces.

**Tech Stack:** React 19, Electron, TypeScript, react-window (new), Node fs.watch

## Global Constraints

- All IPC calls must use AbortableIPC with 10s timeout
- All path inputs must be validated with pathValidator before filesystem operations
- File watching uses fs.watch (recursive on Windows/macOS, manual recursive on Linux)
- Virtualization uses react-window FixedSizeList with 24px row height
- Error boundaries use class components (no new dependencies)
- Context menu uses Radix context-menu (already in dependencies)
- All new utilities must have unit tests with >80% coverage
- Performance target: 60fps during scroll with 1000+ rows

---

## File Structure

### New Files

**Renderer utilities:**
- `renderer/src/lib/abortableIPC.ts` — React hook for request cancellation and stale response protection
- `renderer/src/lib/abortableIPC.test.ts` — Unit tests

**Main process utilities:**
- `src/main/lib/pathValidator.ts` — Path security validation with realpath resolution and caching
- `src/main/lib/pathValidator.test.ts` — Unit tests
- `src/main/filetree/file-watcher.ts` — Event-driven file watching service
- `src/main/filetree/file-watcher.test.ts` — Unit tests

### Modified Files

**Main process:**
- `src/main/ipc/filetree-handlers.ts` — Add path validation, improve binary detection, make active files recursive
- `src/main/ipc/filetree-handlers.test.ts` — Update tests for new behaviors

**Renderer:**
- `renderer/src/components/dashboard/FileTreePanel.tsx` — AbortableIPC, event-driven updates, virtualization, Radix context menu, watcher indicator, refresh improvements
- `renderer/src/components/dashboard/FileTreePanel.test.tsx` — Update tests
- `renderer/src/components/dashboard/FilePreview.tsx` — AbortableIPC, content reset on path change
- `renderer/src/components/dashboard/FilePreview.test.tsx` — Update tests
- `renderer/src/components/dashboard/TerminalPanel.tsx` — Add error boundary around FilePreview
- `renderer/src/types/filetree.ts` — Add onWatchEvent to FiletreeAPI interface
- `src/preload.ts` — Expose onWatchEvent listener

---

## Task 1: Add react-window dependency

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: Nothing
- Produces: react-window and @types/react-window available for import

- [ ] **Step 1: Install react-window**

Run:
```bash
pnpm add react-window
pnpm add -D @types/react-window
```

Expected: Dependencies added to package.json, node_modules updated

- [ ] **Step 2: Verify installation**

Run:
```bash
node -e "require('react-window'); console.log('react-window installed')"
```

Expected: "react-window installed"

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-window for file tree virtualization"
```

---

## Task 2: Implement AbortableIPC hook

**Files:**
- Create: `renderer/src/lib/abortableIPC.ts`
- Create: `renderer/src/lib/abortableIPC.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `useAbortableIPC()` hook that returns `{ call, abortAll }`

- [ ] **Step 1: Write failing test for basic call**

Create `renderer/src/lib/abortableIPC.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAbortableIPC } from './abortableIPC';

describe('useAbortableIPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls IPC and returns data', async () => {
    const mockData = { entries: [] };
    vi.spyOn(window.api.filetree, 'listDir').mockResolvedValue(mockData);

    const { result } = renderHook(() => useAbortableIPC());
    const response = await result.current.call('filetree:listDir', { path: '/test' });

    expect(response.aborted).toBe(false);
    expect(response.data).toEqual(mockData);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/lib/abortableIPC.test.ts`

Expected: FAIL — "useAbortableIPC is not defined"

- [ ] **Step 3: Implement AbortableIPC hook**

Create `renderer/src/lib/abortableIPC.ts`:

```ts
import { useRef, useEffect, useCallback } from 'react';

type IPCResponse<T> = { data: T; aborted: boolean };

export function useAbortableIPC() {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const timeoutMs = 10000;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      controllersRef.current.forEach(controller => controller.abort());
      controllersRef.current.clear();
    };
  }, []);

  const call = useCallback(async <T>(channel: string, args: any): Promise<IPCResponse<T>> => {
    const dedupKey = `${channel}:${JSON.stringify(args)}`;
    
    // Abort previous request with same dedup key
    const existing = controllersRef.current.get(dedupKey);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    controllersRef.current.set(dedupKey, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const [fnName, ...rest] = channel.split(':');
      const methodName = rest.join('');
      const api = (window.api as any)[fnName];
      
      if (!api || !api[methodName]) {
        throw new Error(`IPC method not found: ${channel}`);
      }

      const data = await api[methodName](args);
      clearTimeout(timeoutId);
      
      // Check if this request was aborted
      if (controller.signal.aborted) {
        return { data: null as any, aborted: true };
      }

      // Remove from map
      controllersRef.current.delete(dedupKey);
      
      return { data, aborted: false };
    } catch (error) {
      clearTimeout(timeoutId);
      controllersRef.current.delete(dedupKey);
      
      if (controller.signal.aborted) {
        return { data: null as any, aborted: true };
      }
      
      throw error;
    }
  }, []);

  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
  }, []);

  return { call, abortAll };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/abortableIPC.test.ts`

Expected: PASS

- [ ] **Step 5: Write test for concurrent requests with different dedup keys**

Add to `renderer/src/lib/abortableIPC.test.ts`:

```ts
it('does not abort concurrent requests with different args', async () => {
  const mockData1 = { entries: [{ name: 'file1' }] };
  const mockData2 = { entries: [{ name: 'file2' }] };
  
  vi.spyOn(window.api.filetree, 'listDir')
    .mockResolvedValueOnce(mockData1)
    .mockResolvedValueOnce(mockData2);

  const { result } = renderHook(() => useAbortableIPC());
  
  const [response1, response2] = await Promise.all([
    result.current.call('filetree:listDir', { path: '/test1' }),
    result.current.call('filetree:listDir', { path: '/test2' }),
  ]);

  expect(response1.aborted).toBe(false);
  expect(response1.data).toEqual(mockData1);
  expect(response2.aborted).toBe(false);
  expect(response2.data).toEqual(mockData2);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/abortableIPC.test.ts`

Expected: PASS

- [ ] **Step 7: Write test for stale response protection**

Add to `renderer/src/lib/abortableIPC.test.ts`:

```ts
it('aborts previous request when same dedup key is called again', async () => {
  let resolveFirst: any;
  const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
  
  vi.spyOn(window.api.filetree, 'listDir')
    .mockReturnValueOnce(firstPromise)
    .mockResolvedValueOnce({ entries: [] });

  const { result } = renderHook(() => useAbortableIPC());
  
  const firstCall = result.current.call('filetree:listDir', { path: '/test' });
  const secondCall = result.current.call('filetree:listDir', { path: '/test' });
  
  resolveFirst({ entries: [{ name: 'old' }] });
  
  const [response1, response2] = await Promise.all([firstCall, secondCall]);

  expect(response1.aborted).toBe(true);
  expect(response2.aborted).toBe(false);
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test renderer/src/lib/abortableIPC.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add renderer/src/lib/abortableIPC.ts renderer/src/lib/abortableIPC.test.ts
git commit -m "feat: add AbortableIPC hook for request cancellation"
```

---

## Task 3: Implement pathValidator

**Files:**
- Create: `src/main/lib/pathValidator.ts`
- Create: `src/main/lib/pathValidator.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `validatePath(requestedPath, allowedRoots)` async function

- [ ] **Step 1: Write failing test for valid path**

Create `src/main/lib/pathValidator.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validatePath } from './pathValidator';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('pathValidator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathvalidator-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('accepts paths within allowed root', async () => {
    const filePath = path.join(testDir, 'file.txt');
    fs.writeFileSync(filePath, 'test');

    const result = await validatePath(filePath, [testDir]);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.resolved).toBe(filePath);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/pathValidator.test.ts`

Expected: FAIL — "validatePath is not defined"

- [ ] **Step 3: Implement pathValidator**

Create `src/main/lib/pathValidator.ts`:

```ts
import fs from 'fs';
import path from 'path';

const realpathCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export async function validatePath(
  requestedPath: string,
  allowedRoots: string[]
): Promise<{ valid: true; resolved: string } | { valid: false; reason: string }> {
  try {
    // Check cache first
    let resolved = realpathCache.get(requestedPath);
    
    if (!resolved) {
      try {
        resolved = await fs.promises.realpath(requestedPath);
        
        // Update cache
        if (realpathCache.size >= MAX_CACHE_SIZE) {
          // Simple LRU: clear half the cache
          const keys = Array.from(realpathCache.keys());
          for (let i = 0; i < keys.length / 2; i++) {
            realpathCache.delete(keys[i]);
          }
        }
        realpathCache.set(requestedPath, resolved);
      } catch (error) {
        // Path doesn't exist — validate against nearest existing ancestor
        let current = path.dirname(requestedPath);
        while (current !== path.dirname(current)) {
          try {
            const ancestorResolved = await fs.promises.realpath(current);
            resolved = path.join(ancestorResolved, path.relative(current, requestedPath));
            break;
          } catch {
            current = path.dirname(current);
          }
        }
        
        if (!resolved) {
          return { valid: false, reason: 'Path does not exist and no valid ancestor found' };
        }
      }
    }

    // Check if resolved path is within any allowed root
    for (const root of allowedRoots) {
      const normalizedRoot = path.resolve(root);
      if (resolved.startsWith(normalizedRoot + path.sep) || resolved === normalizedRoot) {
        return { valid: true, resolved };
      }
    }

    return { valid: false, reason: 'Path is outside allowed roots' };
  } catch (error) {
    return { valid: false, reason: `Validation failed: ${error}` };
  }
}

export function clearPathCache() {
  realpathCache.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/lib/pathValidator.test.ts`

Expected: PASS

- [ ] **Step 5: Write test for path outside allowed root**

Add to `src/main/lib/pathValidator.test.ts`:

```ts
it('rejects paths outside allowed root', async () => {
  const outsidePath = path.join(os.tmpdir(), 'outside.txt');
  fs.writeFileSync(outsidePath, 'test');

  const result = await validatePath(outsidePath, [testDir]);
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.reason).toContain('outside allowed roots');
  }

  fs.unlinkSync(outsidePath);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/main/lib/pathValidator.test.ts`

Expected: PASS

- [ ] **Step 7: Write test for non-existent path**

Add to `src/main/lib/pathValidator.test.ts`:

```ts
it('handles non-existent paths by validating ancestor', async () => {
  const nonExistent = path.join(testDir, 'does-not-exist.txt');

  const result = await validatePath(nonExistent, [testDir]);
  expect(result.valid).toBe(true);
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/main/lib/pathValidator.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/main/lib/pathValidator.ts src/main/lib/pathValidator.test.ts
git commit -m "feat: add pathValidator with realpath resolution and caching"
```

---

## Task 4: Implement FileWatcherService

**Files:**
- Create: `src/main/filetree/file-watcher.ts`
- Create: `src/main/filetree/file-watcher.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: FileWatcherService class with `watch()`, `unwatch()`, `on()` methods

- [ ] **Step 1: Write failing test for file change event**

Create `src/main/filetree/file-watcher.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWatcherService } from './file-watcher';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileWatcherService', () => {
  let testDir: string;
  let service: FileWatcherService;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filewatcher-test-'));
    service = new FileWatcherService();
  });

  afterEach(() => {
    service.unwatch(testDir);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('emits files-changed event when file is created', async () => {
    const eventPromise = new Promise<void>((resolve) => {
      service.on('files-changed', (projectPath) => {
        if (projectPath === testDir) {
          resolve();
        }
      });
    });

    service.watch(testDir);
    
    // Create a file
    fs.writeFileSync(path.join(testDir, 'test.txt'), 'content');
    
    await eventPromise;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/filetree/file-watcher.test.ts`

Expected: FAIL — "FileWatcherService is not defined"

- [ ] **Step 3: Implement FileWatcherService**

Create `src/main/filetree/file-watcher.ts`:

```ts
import fs from 'fs';
import path from 'path';

type EventType = 'files-changed' | 'git-changed';
type EventHandler = (projectPath: string) => void;

export class FileWatcherService {
  private watchers = new Map<string, fs.FSWatcher[]>();
  private handlers = new Map<EventType, Set<EventHandler>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  watch(projectPath: string): void {
    if (this.watchers.has(projectPath)) {
      return; // Already watching
    }

    const watchers: fs.FSWatcher[] = [];

    if (process.platform === 'win32' || process.platform === 'darwin') {
      // Recursive mode on Windows/macOS
      try {
        const watcher = fs.watch(projectPath, { recursive: true }, (eventType, filename) => {
          this.handleChange(projectPath, filename);
        });
        watchers.push(watcher);
      } catch (error) {
        console.error('Failed to watch path:', projectPath, error);
      }
    } else {
      // Linux: manual recursive watch
      this.watchRecursive(projectPath, watchers);
    }

    this.watchers.set(projectPath, watchers);
  }

  private watchRecursive(dir: string, watchers: fs.FSWatcher[]): void {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        this.handleChange(dir, filename);
      });
      watchers.push(watcher);

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.watchRecursive(path.join(dir, entry.name), watchers);
        }
      }
    } catch (error) {
      console.error('Failed to watch directory:', dir, error);
    }
  }

  private handleChange(projectPath: string, filename: string | null): void {
    const eventType: EventType = filename?.includes('.git') ? 'git-changed' : 'files-changed';
    const debounceMs = eventType === 'git-changed' ? 1000 : 200;
    const key = `${projectPath}:${eventType}`;

    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => handler(projectPath));
      }
      this.debounceTimers.delete(key);
    }, debounceMs);

    this.debounceTimers.set(key, timer);
  }

  unwatch(projectPath: string): void {
    const watchers = this.watchers.get(projectPath);
    if (watchers) {
      watchers.forEach(watcher => watcher.close());
      this.watchers.delete(projectPath);
    }

    // Clear debounce timers
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith(projectPath + ':')) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }
  }

  on(event: EventType, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/filetree/file-watcher.test.ts`

Expected: PASS

- [ ] **Step 5: Write test for unwatch cleanup**

Add to `src/main/filetree/file-watcher.test.ts`:

```ts
it('cleans up watchers on unwatch', () => {
  service.watch(testDir);
  expect((service as any).watchers.has(testDir)).toBe(true);

  service.unwatch(testDir);
  expect((service as any).watchers.has(testDir)).toBe(false);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/main/filetree/file-watcher.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/filetree/file-watcher.ts src/main/filetree/file-watcher.test.ts
git commit -m "feat: add FileWatcherService for event-driven file watching"
```

---

## Task 5: Apply path validation to filetree handlers

**Files:**
- Modify: `src/main/ipc/filetree-handlers.ts`
- Modify: `src/main/ipc/filetree-handlers.test.ts`

**Interfaces:**
- Consumes: `validatePath` from `src/main/lib/pathValidator.ts`
- Produces: All handlers validate paths before filesystem operations

- [ ] **Step 1: Write failing test for path validation**

Add to `src/main/ipc/filetree-handlers.test.ts`:

```ts
it('rejects paths outside allowed roots', async () => {
  const outsidePath = path.join(os.tmpdir(), 'outside.txt');
  
  await expect(
    ipcRenderer.invoke('filetree:listDir', { path: outsidePath })
  ).rejects.toThrow('Path not allowed');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: FAIL — test expects rejection but handler accepts the path

- [ ] **Step 3: Add path validation to listDir handler**

Modify `src/main/ipc/filetree-handlers.ts`:

```ts
import { validatePath } from '../lib/pathValidator';

// In registerFiletreeHandlers:
ipcMain.handle('filetree:listDir', async (_event, { path: dirPath }: { path: string }) => {
  const check = await validatePath(dirPath, allowedRoots);
  if (!check.valid) throw new Error(`Path not allowed: ${check.reason}`);
  
  // ... rest of handler using check.resolved
});
```

- [ ] **Step 4: Add path validation to all other handlers**

Apply the same pattern to: `getFileContent`, `copyPath`, `revealInFileManager`, `openInTerminal`, `getActiveFiles`, `getGitStatus`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc/filetree-handlers.ts src/main/ipc/filetree-handlers.test.ts
git commit -m "feat: add path validation to all filetree handlers"
```

---

## Task 6: Improve binary detection

**Files:**
- Modify: `src/main/ipc/filetree-handlers.ts`
- Modify: `src/main/ipc/filetree-handlers.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: Improved binary detection that handles UTF-16 correctly

- [ ] **Step 1: Write failing test for UTF-16 file**

Add to `src/main/ipc/filetree-handlers.test.ts`:

```ts
it('correctly identifies UTF-16 files as text', async () => {
  const utf16Path = path.join(testDir, 'utf16.txt');
  const content = 'Hello, world!';
  const buffer = Buffer.from(content, 'utf16le');
  fs.writeFileSync(utf16Path, buffer);

  const result = await ipcRenderer.invoke('filetree:getFileContent', { path: utf16Path });
  expect(result.isBinary).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: FAIL — current implementation marks UTF-16 as binary

- [ ] **Step 3: Implement improved binary detection**

Modify `getFileContent` handler in `src/main/ipc/filetree-handlers.ts`:

```ts
ipcMain.handle('filetree:getFileContent', async (_event, { path: filePath }) => {
  const check = await validatePath(filePath, allowedRoots);
  if (!check.valid) throw new Error(`Path not allowed: ${check.reason}`);

  const stats = await fs.promises.stat(check.resolved);
  
  if (stats.size > MAX_FILE_SIZE) {
    return { content: '', size: stats.size, isBinary: true };
  }

  const buffer = await fs.promises.readFile(check.resolved);
  const sample = buffer.slice(0, 512);

  // Check for BOMs
  if (sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
    return { content: buffer.toString('utf-8'), size: stats.size, isBinary: false };
  }
  if (sample[0] === 0xFF && sample[1] === 0xFE) {
    return { content: buffer.toString('utf16le'), size: stats.size, isBinary: false };
  }
  if (sample[0] === 0xFE && sample[1] === 0xFF) {
    return { content: buffer.toString('utf16be'), size: stats.size, isBinary: false };
  }

  // Check for null bytes
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      return { content: '', size: stats.size, isBinary: true };
    }
  }

  // Validate UTF-8
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
    return { content: buffer.toString('utf-8'), size: stats.size, isBinary: false };
  } catch {
    return { content: '', size: stats.size, isBinary: true };
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/filetree-handlers.ts src/main/ipc/filetree-handlers.test.ts
git commit -m "feat: improve binary detection to handle UTF-16 correctly"
```

---

## Task 7: Make active files recursive

**Files:**
- Modify: `src/main/ipc/filetree-handlers.ts`
- Modify: `src/main/ipc/filetree-handlers.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `getActiveFiles` scans up to 3 levels deep

- [ ] **Step 1: Write failing test for recursive scan**

Add to `src/main/ipc/filetree-handlers.test.ts`:

```ts
it('scans recursively up to 3 levels deep', async () => {
  const subDir = path.join(testDir, 'level1', 'level2', 'level3');
  fs.mkdirSync(subDir, { recursive: true });
  const deepFile = path.join(subDir, 'deep.txt');
  fs.writeFileSync(deepFile, 'content');

  const result = await ipcRenderer.invoke('filetree:getActiveFiles', {
    projectPath: testDir,
    agentCwds: [],
  });

  expect(result.files.some(f => f.path === deepFile)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: FAIL — current implementation only scans top level

- [ ] **Step 3: Implement recursive scan**

Modify `getActiveFiles` handler in `src/main/ipc/filetree-handlers.ts`:

```ts
async function scanForActiveFiles(
  dir: string,
  projectRoot: string,
  depth: number,
  maxDepth: number
): Promise<Array<{ path: string; relativePath: string; modifiedAt: number }>> {
  if (depth > maxDepth) return [];

  const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__', '.venv', 'venv', 'target'];
  const result: Array<{ path: string; relativePath: string; modifiedAt: number }> = [];
  const now = Date.now();
  const threshold = 30000;

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          const subFiles = await scanForActiveFiles(fullPath, projectRoot, depth + 1, maxDepth);
          result.push(...subFiles);
        }
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs < threshold) {
          const relPath = path.relative(projectRoot, fullPath);
          result.push({ path: fullPath, relativePath: relPath, modifiedAt: stats.mtimeMs });
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return result;
}

// In handler:
ipcMain.handle('filetree:getActiveFiles', async (_event, { projectPath, agentCwds }) => {
  const check = await validatePath(projectPath, allowedRoots);
  if (!check.valid) throw new Error(`Path not allowed: ${check.reason}`);

  const dirsToScan = agentCwds.length > 0 ? agentCwds : [check.resolved];
  const allFiles: Array<{ path: string; relativePath: string; modifiedAt: number }> = [];

  for (const dir of dirsToScan) {
    const files = await scanForActiveFiles(dir, check.resolved, 0, 3);
    allFiles.push(...files);
  }

  allFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return { files: allFiles.slice(0, 10) };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/ipc/filetree-handlers.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/filetree-handlers.ts src/main/ipc/filetree-handlers.test.ts
git commit -m "feat: make active files scan recursively up to 3 levels deep"
```

---

## Task 8: Integrate FileWatcherService with IPC

**Files:**
- Modify: `src/main/ipc/filetree-handlers.ts`
- Modify: `src/preload.ts`
- Modify: `renderer/src/types/filetree.ts`

**Interfaces:**
- Consumes: FileWatcherService from `src/main/filetree/file-watcher.ts`
- Produces: `filetree:watch-event` IPC channel for push-based events

- [ ] **Step 1: Instantiate FileWatcherService in handlers**

Modify `src/main/ipc/filetree-handlers.ts`:

```ts
import { FileWatcherService } from '../filetree/file-watcher';

const fileWatcher = new FileWatcherService();

export function registerFiletreeHandlers(mainWindow: BrowserWindow): void {
  // ... existing handlers ...

  // Start watching when a project is opened
  fileWatcher.on('files-changed', (projectPath) => {
    mainWindow.webContents.send('filetree:watch-event', {
      type: 'files-changed',
      projectPath,
    });
  });

  fileWatcher.on('git-changed', (projectPath) => {
    mainWindow.webContents.send('filetree:watch-event', {
      type: 'git-changed',
      projectPath,
    });
  });
}

export function watchProject(projectPath: string): void {
  fileWatcher.watch(projectPath);
}

export function unwatchProject(projectPath: string): void {
  fileWatcher.unwatch(projectPath);
}
```

- [ ] **Step 2: Expose onWatchEvent in preload**

Modify `src/preload.ts`:

```ts
filetree: {
  // ... existing methods ...
  
  onWatchEvent: (handler: (event: { type: string; projectPath: string }) => void) => {
    const listener = (_event: any, data: any) => handler(data);
    ipcRenderer.on('filetree:watch-event', listener);
    return () => ipcRenderer.removeListener('filetree:watch-event', listener);
  },
}
```

- [ ] **Step 3: Update FiletreeAPI type**

Modify `renderer/src/types/filetree.ts`:

```ts
export interface FiletreeAPI {
  // ... existing methods ...
  onWatchEvent: (handler: (event: { type: 'git-changed' | 'files-changed'; projectPath: string }) => void) => () => void;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/filetree-handlers.ts src/preload.ts renderer/src/types/filetree.ts
git commit -m "feat: integrate FileWatcherService with IPC for push-based events"
```

---

## Task 9: Apply AbortableIPC to FileTreePanel

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`

**Interfaces:**
- Consumes: `useAbortableIPC` from `renderer/src/lib/abortableIPC.ts`
- Produces: All IPC calls in FileTreePanel use AbortableIPC

- [ ] **Step 1: Import and use useAbortableIPC**

Modify `renderer/src/components/dashboard/FileTreePanel.tsx`:

```ts
import { useAbortableIPC } from '@/lib/abortableIPC';

export function FileTreePanel({ ... }: FileTreeProps) {
  const { call } = useAbortableIPC();
  
  // Replace all window.api.filetree.* calls with call()
  // Example:
  const loadGitStatus = async () => {
    try {
      const result = await call<{ status: Record<string, GitStatusEntry> }>(
        'filetree:getGitStatus',
        { repoPath: activeProject.path }
      );
      if (result.aborted) return;
      setGitStatus(result.data.status);
      setGitStatusLoaded(true);
    } catch (err) {
      setGitStatusLoaded(false);
    }
  };
  
  // ... apply same pattern to all other IPC calls
}
```

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/FileTreePanel.test.tsx`

Expected: PASS (behavior unchanged)

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "refactor: apply AbortableIPC to FileTreePanel"
```

---

## Task 10: Apply AbortableIPC to FilePreview

**Files:**
- Modify: `renderer/src/components/dashboard/FilePreview.tsx`

**Interfaces:**
- Consumes: `useAbortableIPC` from `renderer/src/lib/abortableIPC.ts`
- Produces: All IPC calls in FilePreview use AbortableIPC, content resets on path change

- [ ] **Step 1: Import and use useAbortableIPC**

Modify `renderer/src/components/dashboard/FilePreview.tsx`:

```ts
import { useAbortableIPC } from '@/lib/abortableIPC';

export function FilePreview({ path, ... }: FilePreviewProps) {
  const { call } = useAbortableIPC();
  
  useEffect(() => {
    if (!path) return;
    
    const loadFile = async () => {
      setIsLoading(true);
      setContent(null); // Reset to avoid stale content flash
      setError(null);
      
      try {
        const result = await call<FileContentResult>('filetree:getFileContent', { path });
        if (result.aborted) return;
        
        setContent(result.data.content);
        setFileSize(result.data.size);
        setIsBinary(result.data.isBinary);
        setLanguage(getLanguageFromExtension(path));
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Could not read file');
        setIsLoading(false);
      }
    };
    
    loadFile();
  }, [path]);
}
```

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/FilePreview.test.tsx`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/FilePreview.tsx
git commit -m "refactor: apply AbortableIPC to FilePreview with content reset"
```

---

## Task 11: Replace polling with event-driven updates

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`

**Interfaces:**
- Consumes: `onWatchEvent` from FiletreeAPI
- Produces: Event-driven git status and active files updates

- [ ] **Step 1: Remove setInterval calls**

Modify `renderer/src/components/dashboard/FileTreePanel.tsx`:

Remove these two useEffect blocks:
- The one with `setInterval(loadGitStatus, 30000)`
- The one with `setInterval(loadActiveFiles, 5000)`

- [ ] **Step 2: Subscribe to watch events**

Add new useEffect:

```ts
useEffect(() => {
  if (!activeProject?.path) return;
  
  let lastEventTime = Date.now();
  let fallbackPollInterval: NodeJS.Timeout | null = null;
  
  const unsubscribe = window.api.filetree.onWatchEvent((event) => {
    if (event.projectPath !== activeProject.path) return;
    
    lastEventTime = Date.now();
    
    if (event.type === 'git-changed') {
      debouncedRefreshGitStatus();
    } else if (event.type === 'files-changed') {
      debouncedRefreshActiveFiles();
    }
  });
  
  // Debounce functions
  let gitTimer: NodeJS.Timeout | null = null;
  let filesTimer: NodeJS.Timeout | null = null;
  
  const debouncedRefreshGitStatus = () => {
    if (gitTimer) clearTimeout(gitTimer);
    gitTimer = setTimeout(() => loadGitStatus(), 500);
  };
  
  const debouncedRefreshActiveFiles = () => {
    if (filesTimer) clearTimeout(filesTimer);
    filesTimer = setTimeout(() => loadActiveFiles(), 500);
  };
  
  // Fallback polling if no events for 2 minutes
  fallbackPollInterval = setInterval(() => {
    if (Date.now() - lastEventTime > 120000) {
      loadGitStatus();
      loadActiveFiles();
    }
  }, 60000);
  
  return () => {
    unsubscribe();
    if (gitTimer) clearTimeout(gitTimer);
    if (filesTimer) clearTimeout(filesTimer);
    if (fallbackPollInterval) clearInterval(fallbackPollInterval);
  };
}, [activeProject?.path]);
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/FileTreePanel.test.tsx`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "refactor: replace polling with event-driven updates in FileTreePanel"
```

---

## Task 12: Add virtualization to FileTreePanel

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`

**Interfaces:**
- Consumes: `FixedSizeList` from `react-window`
- Produces: Virtualized tree rendering with 60fps scroll performance

- [ ] **Step 1: Import react-window**

Add to `renderer/src/components/dashboard/FileTreePanel.tsx`:

```ts
import { FixedSizeList } from 'react-window';
```

- [ ] **Step 2: Measure container height**

Add ref and ResizeObserver:

```ts
const containerRef = useRef<HTMLDivElement>(null);
const [containerHeight, setContainerHeight] = useState(400); // default

useEffect(() => {
  if (!containerRef.current) return;
  
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setContainerHeight(entry.contentRect.height);
    }
  });
  
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 3: Extract TreeRow component**

Create a new component for row rendering:

```ts
const TreeRow = React.memo(({ node, depth, status, statusColor, badge, onToggle, onSelect, onContextMenu }: any) => {
  // Move the row rendering logic from the flatTree.map() into this component
});
```

- [ ] **Step 4: Replace flatTree.map with FixedSizeList**

Replace the rendering section:

```tsx
<div ref={containerRef} className="flex-1 overflow-hidden">
  <FixedSizeList
    height={containerHeight}
    itemCount={flatTree.length}
    itemSize={24}
    width="100%"
  >
    {({ index, style }) => {
      const { node, depth } = flatTree[index];
      const status = getAggregatedStatus(node.path);
      const statusColor = getStatusColor(status);
      const badge = getDiffBadge(status);
      
      return (
        <div style={style}>
          <TreeRow
            node={node}
            depth={depth}
            status={status}
            statusColor={statusColor}
            badge={badge}
            onToggle={handleToggleExpand}
            onSelect={handleFileSelect}
            onContextMenu={handleContextMenu}
          />
        </div>
      );
    }}
  </FixedSizeList>
</div>
```

- [ ] **Step 5: Run tests and verify scroll performance**

Run: `pnpm test renderer/src/components/dashboard/FileTreePanel.test.tsx`

Expected: PASS

Manual test: Open a project with 1000+ files, scroll through the tree. Should maintain 60fps.

- [ ] **Step 6: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "feat: add virtualization to FileTreePanel with react-window"
```

---

## Task 13: Migrate context menu to Radix

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`

**Interfaces:**
- Consumes: Radix context-menu primitives from `@radix-ui/react-context-menu`
- Produces: Accessible context menu with automatic viewport clamping

- [ ] **Step 1: Import Radix context menu**

Add to `renderer/src/components/dashboard/FileTreePanel.tsx`:

```ts
import * as ContextMenu from '@radix-ui/react-context-menu';
```

- [ ] **Step 2: Remove custom context menu state and logic**

Remove:
- `contextMenu` state
- `contextMenuRef` ref
- `handleContextMenu` callback
- `useEffect` for click-outside detection
- The entire custom context menu JSX

- [ ] **Step 3: Add Radix context menu wrapper**

Wrap the tree in a ContextMenu:

```tsx
<ContextMenu.Root>
  <ContextMenu.Trigger asChild>
    <div ref={fileTreeRef} className="flex-1 overflow-hidden">
      {/* FixedSizeList from Task 12 */}
    </div>
  </ContextMenu.Trigger>
  
  <ContextMenu.Portal>
    <ContextMenu.Content
      className="min-w-[160px] rounded-md shadow-lg py-1"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid var(--border)`,
      }}
    >
      <ContextMenu.Item
        className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:opacity-80"
        style={{ color: 'var(--text-primary)' }}
        onSelect={() => handleCopyPath()}
      >
        <Copy size={14} />
        Copy Path
      </ContextMenu.Item>
      
      {/* ... other menu items ... */}
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
```

- [ ] **Step 4: Update context menu handlers to use selected path**

Add state to track the right-clicked path:

```ts
const [contextMenuPath, setContextMenuPath] = useState<string | null>(null);

// In TreeRow, add onContextMenu handler:
onContextMenu={(e) => {
  e.stopPropagation();
  setContextMenuPath(node.path);
}}
```

- [ ] **Step 5: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/FileTreePanel.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "refactor: migrate context menu to Radix for better accessibility"
```

---

## Task 14: Add error boundary to TerminalPanel

**Files:**
- Modify: `renderer/src/components/dashboard/TerminalPanel.tsx`

**Interfaces:**
- Consumes: Nothing
- Produces: Error boundary around FilePreview

- [ ] **Step 1: Create FilePreviewErrorBoundary class**

Add to `renderer/src/components/dashboard/TerminalPanel.tsx`:

```tsx
class FilePreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error('FilePreview error:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap FilePreview with error boundary**

Find where FilePreview is rendered and wrap it:

```tsx
<FilePreviewErrorBoundary
  fallback={
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p style={{ color: 'var(--text-primary)' }}>Could not render file preview</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 text-sm rounded"
          style={{ backgroundColor: 'var(--accent-indigo)', color: 'var(--text-primary)' }}
        >
          Retry
        </button>
      </div>
    </div>
  }
>
  <FilePreview path={previewFile.path} onClose={...} />
</FilePreviewErrorBoundary>
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/TerminalPanel.test.tsx`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/TerminalPanel.tsx
git commit -m "feat: add error boundary around FilePreview"
```

---

## Task 15: Add watcher status indicator and refresh improvements

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`

**Interfaces:**
- Consumes: Nothing
- Produces: Watcher status indicator, improved refresh button

- [ ] **Step 1: Add watcher status state**

Add state to track watcher status:

```ts
const [watcherActive, setWatcherActive] = useState(true);
```

- [ ] **Step 2: Add watcher status indicator to header**

Add to the header section:

```tsx
<div
  className="w-2 h-2 rounded-full"
  style={{
    backgroundColor: watcherActive ? 'var(--status-staged)' : 'var(--text-muted)',
  }}
  title={watcherActive ? 'Watching for changes' : 'Fallback polling (watcher unavailable)'}
/>
```

- [ ] **Step 3: Add isRefreshing state and update refresh button**

```ts
const [isRefreshing, setIsRefreshing] = useState(false);

// In refresh button:
<button
  onClick={async () => {
    if (!activeProject?.path || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadGitStatus(), loadRoot()]);
    } finally {
      setIsRefreshing(false);
    }
  }}
  disabled={isRefreshing}
>
  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
</button>
```

- [ ] **Step 4: Run tests to verify nothing breaks**

Run: `pnpm test renderer/src/components/dashboard/FileTreePanel.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx
git commit -m "feat: add watcher status indicator and improve refresh button"
```

---

## Task 16: UI polish — spinners and toasts

**Files:**
- Modify: `renderer/src/components/dashboard/FileTreePanel.tsx`
- Modify: `renderer/src/components/dashboard/FilePreview.tsx`

**Interfaces:**
- Consumes: `Spinner` from `ui/Spinner.tsx`, `toast` from `sonner`
- Produces: Consistent loading states, error notifications

- [ ] **Step 1: Replace custom spinners with Spinner component**

In FileTreePanel.tsx and FilePreview.tsx, replace custom inline spinners:

```tsx
import { Spinner } from '@/components/ui/Spinner';

// Old:
<div className="animate-spin w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />

// New:
<Spinner size={16} color="var(--text-muted)" />
```

- [ ] **Step 2: Add toast notifications for errors**

Import toast:

```ts
import { toast } from 'sonner';
```

Add toast calls in error handlers:

```ts
catch (err) {
  toast.error('Operation timed out. The file system may be slow.');
}
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `pnpm test`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/FileTreePanel.tsx renderer/src/components/dashboard/FilePreview.tsx
git commit -m "feat: UI polish — use Spinner component and add toast notifications"
```

---

## Summary

**Total tasks:** 16  
**Estimated time:** 4-6 hours  
**Key deliverables:**
- AbortableIPC hook for request cancellation
- pathValidator for security
- FileWatcherService for event-driven updates
- Virtualized file tree (60fps with 1000+ rows)
- Radix context menu for accessibility
- Error boundary around FilePreview
- Watcher status indicator and improved refresh button
- Consistent UI polish (spinners, toasts)

All changes are backwards compatible. No breaking changes to IPC APIs or component interfaces.
