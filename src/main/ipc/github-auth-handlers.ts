import { ipcMain } from 'electron';
import { authService } from '../github/auth-service';

export function registerGitHubAuthHandlers() {
  ipcMain.handle('github:auth:pat', async (_event, token: string) => {
    return await authService.authenticatePAT(token);
  });

  ipcMain.handle('github:auth:getUser', async () => {
    return authService.getUser();
  });

  ipcMain.handle('github:auth:logout', async () => {
    authService.clearToken();
    return { success: true };
  });
}
