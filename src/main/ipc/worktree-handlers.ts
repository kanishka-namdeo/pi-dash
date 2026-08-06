import { ipcMain } from 'electron';
import { worktreeService } from '../worktree/worktree-service';

export function registerWorktreeHandlers() {
  ipcMain.handle('worktree:create', async (_event, params) => {
    return await worktreeService.create(params);
  });

  ipcMain.handle('worktree:list', async (_event, repoPath: string) => {
    return await worktreeService.list(repoPath);
  });

  ipcMain.handle('worktree:remove', async (_event, worktreePath: string) => {
    await worktreeService.remove(worktreePath);
    return { success: true };
  });

  ipcMain.handle('worktree:getStatus', async (_event, worktreePath: string) => {
    return await worktreeService.getStatus(worktreePath);
  });
}
