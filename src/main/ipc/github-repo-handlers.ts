import { ipcMain } from 'electron';
import { repoService } from '../github/repo-service';

export function registerGitHubRepoHandlers() {
  ipcMain.handle('github:repo:list', async () => {
    return repoService.listRepos();
  });

  ipcMain.handle('github:repo:add', async (_event, owner: string, name: string, localPath: string) => {
    return await repoService.addRepo(owner, name, localPath);
  });

  ipcMain.handle('github:repo:remove', async (_event, id: number) => {
    repoService.removeRepo(id);
    return { success: true };
  });

  ipcMain.handle('github:repo:getActive', async () => {
    return repoService.getActiveRepo();
  });

  ipcMain.handle('github:repo:setActive', async (_event, id: number) => {
    repoService.setActiveRepo(id);
    return { success: true };
  });

  ipcMain.handle('github:repos:getAll', async () => {
    const repos = repoService.listRepos();
    const activeRepo = repoService.getActiveRepo();
    return { repos, activeRepo };
  });
}
