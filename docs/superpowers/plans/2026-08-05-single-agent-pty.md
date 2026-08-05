# Single Agent Real PTY Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mocked terminal with real PTY-backed agent session using node-pty and xterm.js

**Architecture:** SessionManager in main process manages PTY lifecycle, xterm.js in renderer provides terminal UI, IPC bridge with singleton dispatcher routes all session traffic by agentId

**Tech Stack:** Electron, node-pty, @xterm/xterm, React, TypeScript, Vitest

## Global Constraints

- Use `AgentConfig.path` from onboarding to spawn agent binary
- Windows requires `electron-rebuild` for node-pty native module
- One session per agent enforced in SessionManager
- Agent dies on app close (Option B from design)
- Native Electron dialog for directory picker (no custom UI)
- Singleton IPC dispatcher pattern (matches Orca)

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: N/A
- Produces: node-pty, @xterm/xterm, @xterm/addon-fit, electron-rebuild installed

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
pnpm add node-pty @xterm/xterm @xterm/addon-fit
```

- [ ] **Step 2: Install electron-rebuild as dev dependency**

Run:
```bash
pnpm add -D electron-rebuild
```

- [ ] **Step 3: Add postinstall script for native module rebuild**

Edit `package.json` scripts section, add:
```json
"postinstall": "electron-rebuild -f -w node-pty"
```

- [ ] **Step 4: Run postinstall to rebuild node-pty**

Run:
```bash
pnpm postinstall
```

Expected: node-pty compiled for Electron, no errors

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install node-pty, xterm.js, electron-rebuild"
```

---

### Task 2: Add Shared Types

**Files:**
- Modify: `src/shared/types.ts`
- Test: `src/shared/types.test.ts`

**Interfaces:**
- Consumes: N/A
- Produces: `SessionState`, `SessionInfo`, `SpawnParams` types

- [ ] **Step 1: Write failing test for type exports**

Create `src/shared/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { SessionState, SessionInfo, SpawnParams } from './types';

describe('Session types', () => {
  it('should export SessionState type', () => {
    const state: SessionState = 'running';
    expect(state).toBe('running');
  });

  it('should export SessionInfo type', () => {
    const info: SessionInfo = {
      agentId: 'test-agent',
      cwd: '/test/path',
      pid: 1234,
      state: 'running',
    };
    expect(info.agentId).toBe('test-agent');
  });

  it('should export SpawnParams type', () => {
    const params: SpawnParams = {
      agentId: 'test-agent',
      cwd: '/test/path',
    };
    expect(params.agentId).toBe('test-agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/types.test.ts`
Expected: FAIL — types not exported

- [ ] **Step 3: Add type definitions**

Edit `src/shared/types.ts`, add at end:
```typescript
export type SessionState = 'idle' | 'running' | 'exited';

export type SessionInfo = {
  agentId: string;
  cwd: string;
  pid: number;
  state: SessionState;
  exitCode?: number;
};

export type SpawnParams = {
  agentId: string;
  cwd: string;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/shared/types.test.ts
git commit -m "feat: add session types (SessionState, SessionInfo, SpawnParams)"
```

---

### Task 3: Create Session Class

**Files:**
- Create: `src/main/session/session.ts`
- Test: `src/main/session/session.test.ts`

**Interfaces:**
- Consumes: `SessionState` from `src/shared/types.ts`
- Produces: `Session` class with `spawn()`, `write()`, `resize()`, `kill()`, `onData()`, `onExit()`

- [ ] **Step 1: Write failing test for Session spawn**

Create `src/main/session/session.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Session } from './session';

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({
    pid: 1234,
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn((cb) => {
      setTimeout(() => cb('test output'), 10);
      return { dispose: vi.fn() };
    }),
    onExit: vi.fn(() => ({ dispose: vi.fn() })),
  })),
}));

describe('Session', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session('test-agent', '/test/cwd', '/usr/bin/pi');
  });

  it('should spawn PTY and return pid', async () => {
    const pid = await session.spawn();
    expect(pid).toBe(1234);
    expect(session.state).toBe('running');
  });

  it('should write data to PTY', async () => {
    await session.spawn();
    const writeSpy = vi.spyOn(session['ptyProcess']!, 'write');
    session.write('test input');
    expect(writeSpy).toHaveBeenCalledWith('test input');
  });

  it('should resize PTY', async () => {
    await session.spawn();
    const resizeSpy = vi.spyOn(session['ptyProcess']!, 'resize');
    session.resize(120, 40);
    expect(resizeSpy).toHaveBeenCalledWith(120, 40);
  });

  it('should kill PTY', async () => {
    await session.spawn();
    const killSpy = vi.spyOn(session['ptyProcess']!, 'kill');
    session.kill();
    expect(killSpy).toHaveBeenCalled();
  });

  it('should emit data events', async () => {
    await session.spawn();
    const callback = vi.fn();
    session.onData(callback);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(callback).toHaveBeenCalledWith('test output');
  });

  it('should not write when not running', () => {
    const writeSpy = vi.fn();
    session['ptyProcess'] = { write: writeSpy } as any;
    session.state = 'exited';
    session.write('test');
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/session/session.test.ts`
Expected: FAIL — Session class not found

- [ ] **Step 3: Create Session class**

Create `src/main/session/session.ts`:
```typescript
import * as pty from 'node-pty';
import type { SessionState } from '../../shared/types';

export class Session {
  private ptyProcess: pty.IPty | null = null;
  private dataCallbacks: ((data: string) => void)[] = [];
  private exitCallbacks: ((exitCode: number) => void)[] = [];
  
  state: SessionState = 'idle';
  pid: number | null = null;
  exitCode: number | null = null;

  constructor(
    public agentId: string,
    public cwd: string,
    private agentPath: string
  ) {}

  async spawn(): Promise<number> {
    this.ptyProcess = pty.spawn(this.agentPath, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: this.cwd,
      env: process.env,
    });

    this.pid = this.ptyProcess.pid;
    this.state = 'running';

    this.ptyProcess.onData((data) => {
      this.dataCallbacks.forEach(cb => cb(data));
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      this.exitCode = exitCode;
      this.state = 'exited';
      this.exitCallbacks.forEach(cb => cb(exitCode));
    });

    return this.pid;
  }

  write(data: string): void {
    if (this.state !== 'running' || !this.ptyProcess) return;
    this.ptyProcess.write(data);
  }

  resize(cols: number, rows: number): void {
    if (!this.ptyProcess) return;
    this.ptyProcess.resize(cols, rows);
  }

  kill(): void {
    if (!this.ptyProcess) return;
    this.ptyProcess.kill();
  }

  onData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: (exitCode: number) => void): void {
    this.exitCallbacks.push(callback);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/session/session.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/session/session.ts src/main/session/session.test.ts
git commit -m "feat: add Session class wrapping node-pty"
```

---

### Task 4: Create SessionManager

**Files:**
- Create: `src/main/session/session-manager.ts`
- Test: `src/main/session/session-manager.test.ts`

**Interfaces:**
- Consumes: `Session` from `src/main/session/session.ts`, agent store from `src/main/agent-store.ts`
- Produces: `SessionManager` class with `createSession()`, `getSession()`, `listSessions()`, `destroySession()`, `destroyAll()`

- [ ] **Step 1: Write failing test for createSession**

Create `src/main/session/session-manager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './session-manager';
import { Session } from './session';

vi.mock('./session');
vi.mock('../agent-store', () => ({
  loadAgents: vi.fn(() => Promise.resolve({
    agents: [{ id: 'test-agent', path: '/usr/bin/pi', name: 'Pi', icon: 'pi' }],
  })),
}));

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
    vi.clearAllMocks();
  });

  it('should create session for agent', async () => {
    const mockSpawn = vi.fn().mockResolvedValue(1234);
    vi.mocked(Session).mockImplementation(() => ({
      spawn: mockSpawn,
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    const session = await manager.createSession('test-agent', '/test/cwd');
    expect(session.pid).toBe(1234);
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should reject duplicate session', async () => {
    vi.mocked(Session).mockImplementation(() => ({
      spawn: vi.fn().mockResolvedValue(1234),
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    await manager.createSession('test-agent', '/test/cwd');
    await expect(manager.createSession('test-agent', '/test/cwd'))
      .rejects.toThrow('Session already active');
  });

  it('should throw if agent not found', async () => {
    await expect(manager.createSession('nonexistent', '/test/cwd'))
      .rejects.toThrow('Agent not configured');
  });

  it('should get session by agentId', async () => {
    vi.mocked(Session).mockImplementation(() => ({
      spawn: vi.fn().mockResolvedValue(1234),
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    await manager.createSession('test-agent', '/test/cwd');
    const session = manager.getSession('test-agent');
    expect(session).not.toBeNull();
    expect(session?.agentId).toBe('test-agent');
  });

  it('should return null for unknown agent', () => {
    expect(manager.getSession('unknown')).toBeNull();
  });

  it('should list all sessions', async () => {
    vi.mocked(Session).mockImplementation(() => ({
      spawn: vi.fn().mockResolvedValue(1234),
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    await manager.createSession('test-agent', '/test/cwd');
    const sessions = manager.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].agentId).toBe('test-agent');
  });

  it('should destroy session', async () => {
    const mockKill = vi.fn();
    vi.mocked(Session).mockImplementation(() => ({
      spawn: vi.fn().mockResolvedValue(1234),
      kill: mockKill,
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    await manager.createSession('test-agent', '/test/cwd');
    manager.destroySession('test-agent');
    expect(mockKill).toHaveBeenCalled();
    expect(manager.getSession('test-agent')).toBeNull();
  });

  it('should destroy all sessions', async () => {
    const mockKill = vi.fn();
    vi.mocked(Session).mockImplementation(() => ({
      spawn: vi.fn().mockResolvedValue(1234),
      kill: mockKill,
      agentId: 'test-agent',
      cwd: '/test/cwd',
      pid: 1234,
      state: 'running',
    }) as any);

    await manager.createSession('test-agent', '/test/cwd');
    manager.destroyAll();
    expect(mockKill).toHaveBeenCalled();
    expect(manager.listSessions()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/session/session-manager.test.ts`
Expected: FAIL — SessionManager not found

- [ ] **Step 3: Create SessionManager class**

Create `src/main/session/session-manager.ts`:
```typescript
import { Session } from './session';
import { loadAgents } from '../agent-store';
import type { SessionInfo } from '../../shared/types';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  async createSession(agentId: string, cwd: string): Promise<Session> {
    if (this.sessions.has(agentId)) {
      throw new Error('Session already active');
    }

    const store = await loadAgents();
    const agent = store.agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error('Agent not configured, please re-run onboarding');
    }

    const session = new Session(agentId, cwd, agent.path);
    await session.spawn();
    this.sessions.set(agentId, session);
    return session;
  }

  getSession(agentId: string): Session | null {
    return this.sessions.get(agentId) || null;
  }

  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(s => ({
      agentId: s.agentId,
      cwd: s.cwd,
      pid: s.pid!,
      state: s.state,
      exitCode: s.exitCode ?? undefined,
    }));
  }

  destroySession(agentId: string): void {
    const session = this.sessions.get(agentId);
    if (session) {
      session.kill();
      this.sessions.delete(agentId);
    }
  }

  destroyAll(): void {
    for (const session of this.sessions.values()) {
      session.kill();
    }
    this.sessions.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/session/session-manager.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/session/session-manager.ts src/main/session/session-manager.test.ts
git commit -m "feat: add SessionManager for session lifecycle"
```

---

### Task 5: Create IPC Handlers

**Files:**
- Create: `src/main/ipc/session-handlers.ts`
- Create: `src/main/ipc/dialog-handlers.ts`
- Test: `src/main/ipc/session-handlers.test.ts`
- Test: `src/main/ipc/dialog-handlers.test.ts`

**Interfaces:**
- Consumes: `SessionManager` from `src/main/session/session-manager.ts`
- Produces: IPC handlers for `session:spawn`, `session:get`, `session:list`, `session:write`, `session:resize`, `session:destroy`, `dialog:openDirectory`

- [ ] **Step 1: Write failing test for session IPC handlers**

Create `src/main/ipc/session-handlers.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSessionHandlers } from './session-handlers';
import { SessionManager } from '../session/session-manager';

const mockHandle = vi.fn();
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
}));

vi.mock('../session/session-manager');

describe('registerSessionHandlers', () => {
  let manager: SessionManager;

  beforeEach(() => {
    mockHandle.mockClear();
    manager = new SessionManager();
  });

  it('should register all session handlers', () => {
    registerSessionHandlers(manager);
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0]);
    expect(channels).toContain('session:spawn');
    expect(channels).toContain('session:get');
    expect(channels).toContain('session:list');
    expect(channels).toContain('session:write');
    expect(channels).toContain('session:resize');
    expect(channels).toContain('session:destroy');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/ipc/session-handlers.test.ts`
Expected: FAIL — registerSessionHandlers not found

- [ ] **Step 3: Create session IPC handlers**

Create `src/main/ipc/session-handlers.ts`:
```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { SessionManager } from '../session/session-manager';
import type { SpawnParams } from '../../shared/types';

export function registerSessionHandlers(manager: SessionManager): void {
  ipcMain.handle('session:spawn', async (_event, params: SpawnParams) => {
    const session = await manager.createSession(params.agentId, params.cwd);

    session.onData((data) => {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('session:data', params.agentId, data);
      });
    });

    session.onExit((exitCode) => {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('session:exit', params.agentId, exitCode);
      });
    });

    return { pid: session.pid };
  });

  ipcMain.handle('session:get', async (_event, agentId: string) => {
    const session = manager.getSession(agentId);
    if (!session) return null;
    return {
      agentId: session.agentId,
      cwd: session.cwd,
      pid: session.pid,
      state: session.state,
      exitCode: session.exitCode,
    };
  });

  ipcMain.handle('session:list', async () => {
    return manager.listSessions();
  });

  ipcMain.handle('session:write', async (_event, agentId: string, data: string) => {
    const session = manager.getSession(agentId);
    if (session) session.write(data);
  });

  ipcMain.handle('session:resize', async (_event, agentId: string, cols: number, rows: number) => {
    const session = manager.getSession(agentId);
    if (session) session.resize(cols, rows);
  });

  ipcMain.handle('session:destroy', async (_event, agentId: string) => {
    manager.destroySession(agentId);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/ipc/session-handlers.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for dialog handler**

Create `src/main/ipc/dialog-handlers.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDialogHandlers } from './dialog-handlers';

const mockHandle = vi.fn();
const mockShowOpenDialog = vi.fn();

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  dialog: { showOpenDialog: mockShowOpenDialog },
}));

describe('registerDialogHandlers', () => {
  beforeEach(() => {
    mockHandle.mockClear();
    mockShowOpenDialog.mockClear();
  });

  it('should register dialog:openDirectory handler', () => {
    registerDialogHandlers();
    expect(mockHandle).toHaveBeenCalledWith('dialog:openDirectory', expect.any(Function));
  });

  it('should return selected directory path', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/test/path'] });
    registerDialogHandlers();
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'dialog:openDirectory')![1];
    const result = await handler();
    expect(result).toBe('/test/path');
  });

  it('should return null when cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    registerDialogHandlers();
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'dialog:openDirectory')![1];
    const result = await handler();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/main/ipc/dialog-handlers.test.ts`
Expected: FAIL — registerDialogHandlers not found

- [ ] **Step 7: Create dialog IPC handler**

Create `src/main/ipc/dialog-handlers.ts`:
```typescript
import { ipcMain, dialog } from 'electron';

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/main/ipc/dialog-handlers.test.ts`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/main/ipc/session-handlers.ts src/main/ipc/session-handlers.test.ts
git add src/main/ipc/dialog-handlers.ts src/main/ipc/dialog-handlers.test.ts
git commit -m "feat: add IPC handlers for session and dialog"
```

---

### Task 6: Update Preload API

**Files:**
- Modify: `src/preload.ts`
- Modify: `src/renderer/src/types/global.d.ts`

**Interfaces:**
- Consumes: IPC channels from Task 5
- Produces: `window.api.openDirectory()`, `window.api.session.*`

- [ ] **Step 1: Update preload.ts with session and dialog APIs**

Edit `src/preload.ts`, add inside `contextBridge.exposeInMainWorld('api', { ... })`:
```typescript
  // Directory picker
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // Session management
  session: {
    spawn: (agentId: string, cwd: string) =>
      ipcRenderer.invoke('session:spawn', { agentId, cwd }),
    get: (agentId: string) =>
      ipcRenderer.invoke('session:get', agentId),
    list: () =>
      ipcRenderer.invoke('session:list'),
    write: (agentId: string, data: string) =>
      ipcRenderer.invoke('session:write', agentId, data),
    resize: (agentId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('session:resize', agentId, cols, rows),
    destroy: (agentId: string) =>
      ipcRenderer.invoke('session:destroy', agentId),
    onData: (agentId: string, callback: (data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, id: string, data: string) => {
        if (id === agentId) callback(data);
      };
      ipcRenderer.on('session:data', listener);
      return () => ipcRenderer.removeListener('session:data', listener);
    },
    onExit: (agentId: string, callback: (exitCode: number) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) => {
        if (id === agentId) callback(exitCode);
      };
      ipcRenderer.on('session:exit', listener);
      return () => ipcRenderer.removeListener('session:exit', listener);
    },
  },
```

- [ ] **Step 2: Update global.d.ts with new API types**

Edit `src/renderer/src/types/global.d.ts`, add to the `api` interface:
```typescript
      // Directory picker
      openDirectory: () => Promise<string | null>;

      // Session management
      session: {
        spawn: (agentId: string, cwd: string) => Promise<{ pid: number }>;
        get: (agentId: string) => Promise<import('../../../src/shared/types').SessionInfo | null>;
        list: () => Promise<import('../../../src/shared/types').SessionInfo[]>;
        write: (agentId: string, data: string) => Promise<void>;
        resize: (agentId: string, cols: number, rows: number) => Promise<void>;
        destroy: (agentId: string) => Promise<void>;
        onData: (agentId: string, callback: (data: string) => void) => () => void;
        onExit: (agentId: string, callback: (exitCode: number) => void) => () => void;
      };
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/preload.ts src/renderer/src/types/global.d.ts
git commit -m "feat: expose session and dialog APIs via preload"
```

---

### Task 7: Create useSession Hook

**Files:**
- Create: `renderer/src/hooks/useSession.ts`
- Test: `renderer/src/hooks/useSession.test.ts`

**Interfaces:**
- Consumes: `window.api.session` from Task 6
- Produces: `useSession(agentId)` hook returning `{ state, spawn, write, resize, destroy }`

- [ ] **Step 1: Write failing test for useSession hook**

Create `renderer/src/hooks/useSession.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';

const mockApi = {
  session: {
    spawn: vi.fn().mockResolvedValue({ pid: 1234 }),
    write: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
    onData: vi.fn(() => vi.fn()),
    onExit: vi.fn(() => vi.fn()),
  },
};

Object.defineProperty(window, 'api', {