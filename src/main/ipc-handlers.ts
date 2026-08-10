import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { scanSystem, validateAgent, identifyAgent, findInPath } from './agent-scanner';
import { loadAgents, saveAgents, completeOnboarding, resetOnboarding } from './agent-store';
import { getProjects, addProject, updateProject, removeProject, getRecentProjects } from './project-manager';
import { isGitRepo, cloneRepository } from './git-operations';
import { registerFiletreeHandlers } from './ipc/filetree-handlers';
import type { AgentConfig, ExportedConfig } from '../shared/types';

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
  ipcMain.handle('find-agent-in-path', async (_event, binary: string) => {
    const foundPath = await findInPath(binary);
    return { found: foundPath !== null, path: foundPath || undefined };
  });

  // Export config with native save dialog
  ipcMain.handle('export-config', async () => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: `pi-dash-backup-${Date.now()}.json`,
    });
    if (result.canceled || !result.filePath) return { success: false };

    const agents = await loadAgents();
    const projects = await getProjects();
    const config: ExportedConfig = {
      version: 1,
      exportedAt: new Date().toISOString(),
      agents,
      projects,
    };
    await fs.writeFile(result.filePath, JSON.stringify(config, null, 2));
    return { success: true };
  });

  // Import config with native open dialog
  ipcMain.handle('import-config', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false };

    const content = await fs.readFile(result.filePaths[0], 'utf-8');
    let config: ExportedConfig;
    try {
      config = JSON.parse(content) as ExportedConfig;
    } catch {
      throw new Error('INVALID_JSON');
    }

    // Validate structure
    if (config.version !== 1) throw new Error('INCOMPATIBLE_VERSION');
    if (!config.agents || !Array.isArray(config.agents.agents)) throw new Error('INVALID_AGENTS');
    if (!Array.isArray(config.projects)) throw new Error('INVALID_PROJECTS');
    if (typeof config.agents.onboardingCompleted !== 'boolean') throw new Error('INVALID_ONBOARDING');

    await saveAgents(config.agents.agents);

    // Restore onboarding state
    if (config.agents.onboardingCompleted) {
      await completeOnboarding();
    } else {
      await resetOnboarding();
    }
    const projectsPath = path.join(app.getPath('userData'), 'projects.json');
    await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: config.projects }, null, 2));
    return { success: true, config };
  });

  // Reset agents
  ipcMain.handle('reset-agents', async () => {
    await saveAgents([]);
    return { success: true };
  });

  // Reset projects
  ipcMain.handle('reset-projects', async () => {
    const projectsPath = path.join(app.getPath('userData'), 'projects.json');
    await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
    return { success: true };
  });

  // Full reset
  ipcMain.handle('full-reset', async () => {
    await saveAgents([]);
    const projectsPath = path.join(app.getPath('userData'), 'projects.json');
    await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
    await resetOnboarding();
    return { success: true };
  });

  registerFiletreeHandlers();
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

