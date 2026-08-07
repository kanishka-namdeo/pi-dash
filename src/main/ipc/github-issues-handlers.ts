import { ipcMain } from 'electron';
import { issueService } from '../github/issue-service';

export function registerGitHubIssuesHandlers() {
  ipcMain.handle('github:issues:create', async (_event, owner: string, repo: string, title: string, body: string, labels?: string[], assignees?: string[]) => {
    return await issueService.createIssue(owner, repo, title, body, labels, assignees);
  });

  ipcMain.handle('github:issues:comment', async (_event, owner: string, repo: string, issueNumber: number, body: string) => {
    return await issueService.commentOnIssue(owner, repo, issueNumber, body);
  });

  ipcMain.handle('github:issues:update', async (_event, owner: string, repo: string, issueNumber: number, updates: { title?: string; body?: string; state?: 'open' | 'closed' }) => {
    return await issueService.updateIssue(owner, repo, issueNumber, updates);
  });

  ipcMain.handle('github:issues:addLabels', async (_event, owner: string, repo: string, issueNumber: number, labels: string[]) => {
    await issueService.addLabels(owner, repo, issueNumber, labels);
    return { success: true };
  });

  ipcMain.handle('github:issues:removeLabel', async (_event, owner: string, repo: string, issueNumber: number, label: string) => {
    await issueService.removeLabel(owner, repo, issueNumber, label);
    return { success: true };
  });

  ipcMain.handle('github:issues:close', async (_event, owner: string, repo: string, issueNumber: number) => {
    return await issueService.closeIssue(owner, repo, issueNumber);
  });

  ipcMain.handle('github:issues:reopen', async (_event, owner: string, repo: string, issueNumber: number) => {
    return await issueService.reopenIssue(owner, repo, issueNumber);
  });
}
