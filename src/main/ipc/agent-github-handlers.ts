import { ipcMain } from 'electron';
import { agentGitBridge } from '../agent/agent-git-bridge';

export function registerAgentGitHubHandlers() {
  ipcMain.handle('agent-github:createPR', async (_event, worktreePath: string, title: string, body: string) => {
    return await agentGitBridge.createPR(worktreePath, title, body);
  });

  ipcMain.handle('agent-github:commentIssue', async (_event, owner: string, repo: string, issueNumber: number, body: string) => {
    await agentGitBridge.commentOnIssue(owner, repo, issueNumber, body);
    return { success: true };
  });

  ipcMain.handle('agent-github:readFeedback', async (_event, owner: string, repo: string, prNumber: number) => {
    return await agentGitBridge.readPRFeedback(owner, repo, prNumber);
  });

  ipcMain.handle('agent-github:assign', async (_event, worktreeId: string, agentId: string) => {
    return await agentGitBridge.assignAgentToWorktree(worktreeId, agentId);
  });
}
