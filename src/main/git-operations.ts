import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import log from './logger';
import type { CloneError } from '../../renderer/src/types/project-setup';

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

    await git.clone(url, dest, {
      '--branch': branch,
      '--progress': true,
    });

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
