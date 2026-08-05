import { ipcMain, BrowserWindow } from 'electron';
import { SessionManager } from '../session/session-manager';
import type { SessionInfo } from '../../shared/types';

export function registerSessionHandlers(sessionManager: SessionManager) {
  ipcMain.handle('session:create', async (_event, { agentId, cwd }: { agentId: string; cwd: string }) => {
    try {
      const session = await sessionManager.createSession(agentId, cwd);
      setupEventForwarding(agentId, sessionManager);
      return { pid: session.pid, state: session.state };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('session:get', async (_event, { agentId }: { agentId: string }) => {
    try {
      const session = sessionManager.getSession(agentId);
      if (!session) return null;
      return {
        agentId: session.agentId,
        cwd: session.cwd,
        pid: session.pid ?? 0,
        state: session.state,
        exitCode: session.exitCode ?? undefined,
      } as SessionInfo;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('session:list', async () => {
    try {
      return sessionManager.listSessions();
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('session:write', async (_event, { agentId, data }: { agentId: string; data: string }) => {
    try {
      const session = sessionManager.getSession(agentId);
      if (!session) throw new Error(`Session not found: ${agentId}`);
      session.write(data);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('session:resize', async (_event, { agentId, cols, rows }: { agentId: string; cols: number; rows: number }) => {
    try {
      const session = sessionManager.getSession(agentId);
      if (!session) throw new Error(`Session not found: ${agentId}`);
      session.resize(cols, rows);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('session:destroy', async (_event, { agentId }: { agentId: string }) => {
    try {
      sessionManager.destroySession(agentId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });
}

function setupEventForwarding(agentId: string, sessionManager: SessionManager) {
  const session = sessionManager.getSession(agentId);
  if (!session) return;

  session.onData((data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('session:data', agentId, data);
    });
  });

  session.onExit((exitCode) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('session:exit', agentId, exitCode);
    });
  });
}
