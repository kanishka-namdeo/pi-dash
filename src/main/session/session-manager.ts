import { Session } from './session';
import type { SessionInfo } from '../../shared/types';
import { loadAgents } from '../agent-store';
import { SettingsService } from '../settings/settings-service';


export class SessionManager {
  private sessions = new Map<string, Session>();
  private settingsService = new SettingsService();

  async createSession(agentId: string, cwd: string): Promise<Session> {
    if (this.sessions.has(agentId)) {
      throw new Error(`Session already exists for agent: ${agentId}`);
    }

    const store = await loadAgents();
    const agent = store.agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const defaultShell = this.settingsService.get('terminal.defaultShell') as string | undefined;
    const shellArgs = this.settingsService.get('terminal.shellArgs') as string | undefined;

    const session = new Session(agentId, cwd, agent.path, defaultShell, shellArgs);
    await session.spawn();
    this.sessions.set(agentId, session);
    return session;
  }

  getSession(agentId: string): Session | null {
    return this.sessions.get(agentId) ?? null;
  }

  listSessions(): SessionInfo[] {
    const result: SessionInfo[] = [];
    for (const session of this.sessions.values()) {
      result.push({
        agentId: session.agentId,
        cwd: session.cwd,
        pid: session.pid ?? 0,
        state: session.state,
        exitCode: session.exitCode ?? undefined,
      });
    }
    return result;
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
