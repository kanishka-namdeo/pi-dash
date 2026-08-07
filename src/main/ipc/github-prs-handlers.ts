import { ipcMain } from 'electron';
import { prService } from '../github/pr-service';

export function registerGitHubPRsHandlers() {
  ipcMain.handle('github:prs:create', async (_event, args: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    reviewers?: string[];
    labels?: string[];
  }) => {
    return await prService.createPR(args.owner, args.repo, args.title, args.body, args.head, args.base, args.reviewers, args.labels);
  });

  ipcMain.handle('github:prs:review', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    body: string;
  }) => {
    return await prService.submitReview(args.owner, args.repo, args.prNumber, args.event, args.body);
  });

  ipcMain.handle('github:prs:comment', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
  }) => {
    return await prService.commentOnPR(args.owner, args.repo, args.prNumber, args.body);
  });

  ipcMain.handle('github:prs:fetchComments', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    return await prService.fetchPRComments(args.owner, args.repo, args.prNumber);
  });

  ipcMain.handle('github:prs:fetchCI', async (_event, args: {
    owner: string;
    repo: string;
    ref: string;
  }) => {
    return await prService.fetchCIStatus(args.owner, args.repo, args.ref);
  });

  ipcMain.handle('github:prs:merge', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    await prService.mergePR(args.owner, args.repo, args.prNumber);
    return { success: true };
  });

  ipcMain.handle('github:prs:close', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    await prService.closePR(args.owner, args.repo, args.prNumber);
    return { success: true };
  });
}
