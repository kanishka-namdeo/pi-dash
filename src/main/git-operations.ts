import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import log from './logger';
import type { CloneError } from '../shared/project-setup-types';
import type { GitStatus, GitStatusEntry } from '../shared/filetree-types';

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(repoPath, '.git');
    return fs.existsSync(gitDir);
  } catch (error) {
    log.error('git-operations', 'Failed to check git repo', error);
    return false;
  }
}

export async function cloneRepository(
  url: string,
  dest: string,
  branch: string = 'main',
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: CloneError }> {
  try {
    if (fs.existsSync(dest)) {
      return {
        success: false,
        error: { type: 'destination-exists', path: dest }
      };
    }

    const git = simpleGit();

    await git.clone(url, dest, [
      '--branch', branch,
      '--progress',
    ]);

    onProgress?.(100);
    return { success: true };
  } catch (error) {
    log.error('git-operations', 'Clone failed', error);

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('not found') || message.includes('404')) {
      return { success: false, error: { type: 'repository-not-found', message } };
    }

    if (message.includes('authentication') || message.includes('401')) {
      return { success: false, error: { type: 'authentication-required', message } };
    }

    if (message.includes('EACCES') || message.includes('permission')) {
      return { success: false, error: { type: 'permission-denied', path: dest } };
    }

    return { success: false, error: { type: 'unknown', message } };
  }
}

export async function getGitStatus(repoPath: string): Promise<Record<string, GitStatusEntry>> {
  try {
    const git = simpleGit(repoPath);
    
    const isRepo = await isGitRepo(repoPath);
    if (!isRepo) return {};

    const status = await git.status();
    const result: Record<string, GitStatusEntry> = {};

    for (const file of status.files) {
      let gitStatus: GitStatus;

      if (file.index === 'C' || (file.index === 'D' && file.working_dir === 'A')) {
        gitStatus = 'conflict';
      } else if (file.index === 'A' || file.index === 'M' || file.index === 'D') {
        gitStatus = 'staged';
      } else if (file.working_dir === '?') {
        gitStatus = 'untracked';
      } else {
        gitStatus = 'modified';
      }

      result[file.path.replace(/\\/g, '/')] = {
        status: gitStatus,
        additions: 0,
        deletions: 0
      };
    }

    return result;
  } catch (error) {
    console.error('getGitStatus error:', error);
    return {};
  }
}

export async function getDiffStats(repoPath: string): Promise<Record<string, GitStatusEntry>> {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await isGitRepo(repoPath);
    if (!isRepo) return {};

    const result: Record<string, GitStatusEntry> = {};

    // Get diff stats for staged changes
    try {
      const stagedDiff = await git.diffSummary(['--cached']);
      for (const file of stagedDiff.files) {
        if ('insertions' in file && 'deletions' in file) {
          const filePath = file.file.replace(/\\/g, '/');
          if (!result[filePath]) {
            result[filePath] = { status: 'staged', additions: 0, deletions: 0 };
          }
          result[filePath].additions += file.insertions;
          result[filePath].deletions += file.deletions;
          result[filePath].status = 'staged';
        }
      }
    } catch {
      // No staged changes
    }

    // Get diff stats for unstaged changes
    try {
      const workingDiff = await git.diffSummary();
      for (const file of workingDiff.files) {
        if ('insertions' in file && 'deletions' in file) {
          const filePath = file.file.replace(/\\/g, '/');
          if (!result[filePath]) {
            result[filePath] = { status: 'modified', additions: 0, deletions: 0 };
          }
          result[filePath].additions += file.insertions;
          result[filePath].deletions += file.deletions;
          result[filePath].status = 'modified';
        }
      }
    } catch {
      // No unstaged changes
    }

    // Get untracked files
    try {
      const status = await git.status();
      for (const file of status.files) {
        if (file.working_dir === '?') {
          const filePath = file.path.replace(/\\/g, '/');
          if (!result[filePath]) {
            result[filePath] = { status: 'untracked', additions: 0, deletions: 0, untrackedCount: 1 };
          } else {
            result[filePath].untrackedCount = (result[filePath].untrackedCount || 0) + 1;
          }
        }
      }
    } catch {
      // No untracked files
    }

    return result;
  } catch (error) {
    console.error('getDiffStats error:', error);
    return {};
  }
}
