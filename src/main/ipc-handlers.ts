import { ipcMain } from 'electron';
import { scanSystem, validateAgent, identifyAgent } from './agent-scanner';
import { loadAgents, saveAgents, completeOnboarding } from './agent-store';
import { spawn } from 'child_process';
import type { AgentConfig } from '../shared/types';

export function registerIpcHandlers(): void {
  ipcMain.handle('scan-agents', async () => {
    return await scanSystem();
  });

  ipcMain.handle('validate-agent', async (_event, path: string) => {
    return await validateAgent(path);
  });

  ipcMain.handle('identify-agent', async (_event, path: string) => {
    return await identifyAgent(path);
  });

  ipcMain.handle('get-agents', async () => {
    const store = await loadAgents();
    return store.agents;
  });

  ipcMain.handle('save-agents', async (_event, agents: AgentConfig[]) => {
    await saveAgents(agents);
  });

  ipcMain.handle('complete-onboarding', async () => {
    await completeOnboarding();
  });

  ipcMain.handle('get-onboarding-status', async () => {
    const store = await loadAgents();
    return store.onboardingCompleted;
  });

  ipcMain.handle('launch-agent', async (_event, id: string) => {
    const store = await loadAgents();
    const agent = store.agents.find(a => a.id === id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    const child = spawn(agent.path, [], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
    return { pid: child.pid };
  });
}
