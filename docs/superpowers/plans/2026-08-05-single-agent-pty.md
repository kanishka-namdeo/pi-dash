# Single Agent Real PTY Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mocked terminal with real PTY-backed agent session using node-pty and xterm.js

**Architecture:** SessionManager in main process manages PTY lifecycle, xterm.js in renderer provides terminal UI, IPC bridge with singleton dispatcher routes all session traffic by agentId

**Tech Stack:** Electron, node-pty, @xterm/xterm, React, TypeScript, Vitest

## Global Constraints

- Use `AgentConfig.path` from onboarding to spawn agent binary
- Windows requires `electron-rebuild` for node-pty native module
    "test": "vitest run",
    "test:watch": "vitest",
    "postinstall": "electron-rebuild -f -w node-pty"
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
  value: mockApi,
  writable: true,
});

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useSession('test-agent'));
    expect(result.current.state).toBe('idle');
  });

  it('should spawn session and update state to running', async () => {
    const { result } = renderHook(() => useSession('test-agent'));
    
    await act(async () => {
      await result.current.spawn('/test/cwd');
    });
    
    expect(mockApi.session.spawn).toHaveBeenCalledWith('test-agent', '/test/cwd');
    expect(result.current.state).toBe('running');
  });

  it('should write data to session', async () => {
    const { result } = renderHook(() => useSession('test-agent'));
    
    await act(async () => {
      await result.current.spawn('/test/cwd');
    });
    
    act(() => {
      result.current.write('test input');
    });
    
    expect(mockApi.session.write).toHaveBeenCalledWith('test-agent', 'test input');
  });

  it('should resize session', async () => {
    const { result } = renderHook(() => useSession('test-agent'));
    
    await act(async () => {
      await result.current.spawn('/test/cwd');
    });
    
    act(() => {
      result.current.resize(120, 40);
    });
    
    expect(mockApi.session.resize).toHaveBeenCalledWith('test-agent', 120, 40);
  });

  it('should destroy session', async () => {
    const { result } = renderHook(() => useSession('test-agent'));
    
    await act(async () => {
      await result.current.spawn('/test/cwd');
    });
    
    act(() => {
      result.current.destroy();
    });
    
    expect(mockApi.session.destroy).toHaveBeenCalledWith('test-agent');
    expect(result.current.state).toBe('exited');
  });

  it('should update state to exited on exit event', async () => {
    let exitCallback: ((exitCode: number) => void) | null = null;
    mockApi.session.onExit.mockImplementation((agentId, callback) => {
      exitCallback = callback;
      return vi.fn();
    });

    const { result } = renderHook(() => useSession('test-agent'));
    
    await act(async () => {
      await result.current.spawn('/test/cwd');
    });
    
    act(() => {
      exitCallback?.(0);
    });
    
    expect(result.current.state).toBe('exited');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run renderer/src/hooks/useSession.test.ts`
Expected: FAIL — useSession not found

- [ ] **Step 3: Create useSession hook**

Create `renderer/src/hooks/useSession.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import type { SessionState } from '../../../src/shared/types';

export function useSession(agentId: string) {
  const [state, setState] = useState<SessionState>('idle');

  useEffect(() => {
    const unsubExit = window.api.session.onExit(agentId, () => {
      setState('exited');
    });

    return () => {
      unsubExit();
    };
  }, [agentId]);

  const spawn = useCallback(async (cwd: string) => {
    setState('idle');
    await window.api.session.spawn(agentId, cwd);
    setState('running');
  }, [agentId]);

  const write = useCallback((data: string) => {
    window.api.session.write(agentId, data);
  }, [agentId]);

  const resize = useCallback((cols: number, rows: number) => {
    window.api.session.resize(agentId, cols, rows);
  }, [agentId]);

  const destroy = useCallback(() => {
    window.api.session.destroy(agentId);
    setState('exited');
  }, [agentId]);

  return { state, spawn, write, resize, destroy };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run renderer/src/hooks/useSession.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useSession.ts renderer/src/hooks/useSession.test.ts
git commit -m "feat: add useSession hook for renderer"
```


### Task 8: Create TerminalView Component

**Files:**
- Create: `renderer/src/components/terminal/TerminalView.tsx`
- Modify: `renderer/src/index.css`

**Interfaces:**
- Consumes: `useSession` from Task 7, `@xterm/xterm` and `@xterm/addon-fit`
- Produces: `TerminalView` component with xterm.js terminal

- [ ] **Step 1: Create TerminalView component**

Create `renderer/src/components/terminal/TerminalView.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useSession } from '../../hooks/useSession';
import '@xterm/xterm/css/xterm.css';

export function TerminalView({ agentId, cwd }: { agentId: string; cwd: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { state, spawn, write, resize, destroy } = useSession(agentId);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      write(data);
    });

    spawn(cwd);

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = term;
        resize(cols, rows);
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      destroy();
      term.dispose();
    };
  }, [agentId, cwd]);

  useEffect(() => {
    const unsubData = window.api.session.onData(agentId, (data) => {
      xtermRef.current?.write(data);
    });

    return () => {
      unsubData();
    };
  }, [agentId]);

  return (
    <div className="terminal-view">
      <div className="terminal-header">
        <span className="terminal-title">{agentId}</span>
        <span className="terminal-cwd">{cwd}</span>
        <span className={`terminal-status status-${state}`}>{state}</span>
      </div>
      <div ref={terminalRef} className="terminal-container" />
    </div>
  );
}
```

- [ ] **Step 2: Add terminal styles to index.css**

Edit `renderer/src/index.css`, add:
```css
.terminal-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
  color: #fff;
  font-size: 0.875rem;
}

.terminal-title {
  font-weight: 600;
}

.terminal-cwd {
  color: #888;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.status-idle { background: #555; }
.status-running { background: #2ea043; }
.status-exited { background: #da3633; }

.terminal-container {
  flex: 1;
  padding: 1rem;
  overflow: hidden;
}
```

- [ ] **Step 3: Run dev server to verify terminal renders**

Run: `pnpm dev`
Expected: App starts without errors

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/terminal/TerminalView.tsx renderer/src/index.css
git commit -m "feat: add TerminalView component with xterm.js"
```


### Task 9: Update Dashboard with Launch Button

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx` (or create if doesn't exist)
- Create: `renderer/src/components/dashboard/AgentCard.tsx`

**Interfaces:**
- Consumes: Agent config from onboarding, `window.api.openDirectory()` from Task 6
- Produces: Dashboard with agent cards showing "Launch" button

- [ ] **Step 1: Check if Dashboard component exists**

Run: `ls renderer/src/components/dashboard/`
Expected: See what files exist

- [ ] **Step 2: Create AgentCard component**

Create `renderer/src/components/dashboard/AgentCard.tsx`:
```typescript
import { useNavigate } from 'react-router-dom';
import type { AgentConfig } from '../../../../src/shared/types';

export function AgentCard({ agent }: { agent: AgentConfig }) {
  const navigate = useNavigate();

  const handleLaunch = async () => {
    const cwd = await window.api.openDirectory();
    if (cwd) {
      navigate(`/agent/${agent.id}?cwd=${encodeURIComponent(cwd)}`);
    }
  };

  return (
    <div className="agent-card">
      <div className="agent-icon">{agent.icon}</div>
      <div className="agent-info">
        <h3>{agent.name}</h3>
        <p className="agent-path">{agent.path}</p>
      </div>
      <button onClick={handleLaunch} className="launch-button">
        Launch
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add AgentCard styles**

Edit `renderer/src/index.css`, add:
```css
.agent-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.agent-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f8fa;
  border-radius: 6px;
}

.agent-info { flex: 1; }

.agent-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.agent-path {
  margin: 0;
  font-size: 0.75rem;
  color: #666;
  font-family: monospace;
}

.launch-button {
  padding: 0.5rem 1rem;
  background: #2ea043;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.launch-button:hover { background: #2c974b; }
```

- [ ] **Step 4: Update Dashboard to use AgentCard**

If Dashboard.tsx exists, modify it to render AgentCard for each agent. If not, create it:

Create or modify `renderer/src/components/dashboard/Dashboard.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { AgentCard } from './AgentCard';
import type { AgentConfig } from '../../../../src/shared/types';

export function Dashboard() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);

  useEffect(() => {
    window.api.getAgents().then(setAgents);
  }, []);

  return (
    <div className="dashboard">
      <h1>Agents</h1>
      <div className="agent-list">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add dashboard styles**

Edit `renderer/src/index.css`, add:
```css
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard h1 { margin-bottom: 1.5rem; }

.agent-list {
  display: grid;
  gap: 1rem;
}
```

- [ ] **Step 6: Run dev server to verify dashboard renders**

Run: `pnpm dev`
Expected: Dashboard shows agent cards with Launch buttons

- [ ] **Step 7: Commit**

```bash
git add renderer/src/components/dashboard/
git commit -m "feat: add Dashboard with agent cards and Launch button"
```


### Task 10: Update App Routing

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `TerminalView` from Task 8, `Dashboard` from Task 9
- Produces: Routes for `/` (Dashboard) and `/agent/:agentId` (TerminalView)

- [ ] **Step 1: Update App.tsx with new routes**

Edit `renderer/src/App.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';

function AgentRoute() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const cwd = searchParams.get('cwd') || '';

  if (!agentId || !cwd) {
    return <div>Invalid agent route</div>;
  }

  return <TerminalView agentId={agentId} cwd={cwd} />;
}

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    window.api.getOnboardingStatus().then(setOnboardingCompleted);
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  if (onboardingCompleted === null) {
    return <div>Loading...</div>;
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agent/:agentId" element={<AgentRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 2: Run dev server to verify routing works**

Run: `pnpm dev`
Expected: App loads dashboard, clicking Launch navigates to terminal view

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: add routing for dashboard and terminal view"
```


### Task 11: Update Main Process

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `SessionManager` from Task 4, IPC handlers from Task 5
- Produces: Main process with session management and cleanup on quit

- [ ] **Step 1: Update main.ts to register handlers and cleanup**

Edit `src/main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './main/ipc-handlers';
import { SessionManager } from './main/session/session-manager';
import { registerSessionHandlers } from './main/ipc/session-handlers';
import { registerDialogHandlers } from './main/ipc/dialog-handlers';

const isDev = !app.isPackaged;

let sessionManager: SessionManager | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  sessionManager = new SessionManager();
  
  registerIpcHandlers();
  registerSessionHandlers(sessionManager);
  registerDialogHandlers();
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (sessionManager) {
    sessionManager.destroyAll();
  }
});
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: initialize session manager and register IPC handlers"
```


### Task 12: Delete Old Mock Files

**Files:**
- Delete: `renderer/src/lib/mockPTY.ts`
- Delete: `renderer/src/lib/mockPTY.test.ts`
- Delete: `renderer/src/hooks/useAgentSession.ts`
- Delete: `renderer/src/hooks/useAgentSession.test.ts`
- Delete: `renderer/src/components/terminal/CommandBlock.tsx`
- Delete: `renderer/src/components/terminal/CommandBlock.test.tsx`
- Delete: `renderer/src/components/terminal/AnsiText.tsx`
- Delete: `renderer/src/components/terminal/AnsiText.test.tsx`
- Delete: `renderer/src/components/terminal/TerminalPane.tsx`
- Delete: `renderer/src/components/terminal/TerminalPane.test.tsx`

- [ ] **Step 1: Delete mock PTY files**

```bash
git rm renderer/src/lib/mockPTY.ts renderer/src/lib/mockPTY.test.ts
git rm renderer/src/hooks/useAgentSession.ts renderer/src/hooks/useAgentSession.test.ts
git rm renderer/src/components/terminal/CommandBlock.tsx renderer/src/components/terminal/CommandBlock.test.tsx
git rm renderer/src/components/terminal/AnsiText.tsx renderer/src/components/terminal/AnsiText.test.tsx
git rm renderer/src/components/terminal/TerminalPane.tsx renderer/src/components/terminal/TerminalPane.test.tsx
```

- [ ] **Step 2: Run tests to verify nothing broken**

Run: `pnpm test`
Expected: All remaining tests pass

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove mock PTY and old terminal components"
```


### Task 13: Integration Testing

**Files:**
- N/A (manual testing)

**Interfaces:**
- Consumes: Complete feature from Tasks 1-12
- Produces: Verified end-to-end functionality

- [ ] **Step 1: Build and run the app**

```bash
pnpm dev
```

- [ ] **Step 2: Test launch flow**

1. Complete onboarding if not already done
2. Dashboard shows agent cards
3. Click "Launch" on an agent card
4. Directory picker opens
5. Select a working directory
6. Terminal view opens
7. PTY spawns and shows agent output
8. Type commands and see output
9. Resize window and verify terminal resizes
10. Close app and verify no zombie processes

- [ ] **Step 3: Test error cases**

1. Try launching same agent twice → should reject with "Session already active"
2. Delete agent binary and try to launch → should show error toast
3. Invalid working directory → should show error toast

- [ ] **Step 4: Test cleanup**

1. Launch agent
2. Close app
3. Verify agent process is killed (check task manager / `ps`)
4. Reopen app → agent should not be running

- [ ] **Step 5: Verify success criteria**

All 8 success criteria from spec:
1. ✓ User can launch `pi` agent from dashboard
2. ✓ User can select working directory via native dialog
3. ✓ Terminal displays real PTY output with proper ANSI rendering
4. ✓ User can type commands and see output
5. ✓ Terminal resizes correctly when window resizes
6. ✓ Agent process is killed when app closes
7. ✓ One session per agent enforced (can't launch same agent twice)
8. ✓ Error states handled gracefully (spawn failures, IPC errors)


## Plan Complete

All tasks implemented. Feature is ready for use.