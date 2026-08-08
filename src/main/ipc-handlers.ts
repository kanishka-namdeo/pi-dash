import { ipcMain } from 'electron';
import { scanSystem, validateAgent, identifyAgent } from './agent-scanner';
import { loadAgents, saveAgents, completeOnboarding } from './agent-store';
import { getProjects, addProject, updateProject, removeProject, getRecentProjects } from './project-manager';
import { isGitRepo, cloneRepository } from './git-operations';
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

  ipcMain.handle('dialog:openDirectory', async (_event) => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('get-cwd', () => {
    return process.cwd();
  });
}

export function registerProjectHandlers(): void {
  ipcMain.handle('get-projects', async () => {
    return await getProjects();
  });

  ipcMain.handle('add-project', async (_event, project) => {
    return await addProject(project);
  });

  ipcMain.handle('update-project', async (_event, path, updates) => {
    return await updateProject(path, updates);
  });

  ipcMain.handle('remove-project', async (_event, path) => {
    return await removeProject(path);
  });

  ipcMain.handle('get-recent-projects', async (_event, limit) => {
    return await getRecentProjects(limit);
  });

  ipcMain.handle('is-git-repo', async (_event, path) => {
    return await isGitRepo(path);
  });

  ipcMain.handle('clone-repository', async (event, url, dest, branch) => {
    const result = await cloneRepository(url, dest, branch, (progress) => {
      event.sender.send('clone-progress', progress);
    });
    return result;
  });
}

