import { ipcMain } from 'electron';
import { dataService } from '../github/data-service';

export function registerGitHubDataHandlers() {
  ipcMain.handle('github:data:issues', async (_event, owner: string, repo: string) => {
    return await dataService.fetchIssues(owner, repo);
  });

  ipcMain.handle('github:data:prs', async (_event, owner: string, repo: string) => {
    return await dataService.fetchPRs(owner, repo);
  });

  ipcMain.handle('github:data:branches', async (_event, owner: string, repo: string) => {
    return await dataService.fetchBranches(owner, repo);
  });
}
