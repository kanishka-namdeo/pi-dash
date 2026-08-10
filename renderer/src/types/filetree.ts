import type { FileEntry, GitStatusEntry, FileContentResult } from '../shared/filetree-types';

export type { FileEntry, GitStatusEntry, FileContentResult };

export interface FiletreeAPI {
  listDir: (path: string) => Promise<{ entries: FileEntry[] }>;
  getGitStatus: (repoPath: string) => Promise<{ status: Record<string, GitStatusEntry> }>;
  getFileContent: (path: string) => Promise<FileContentResult>;
  copyPath: (path: string, relative?: boolean) => Promise<{ success: boolean }>;
  revealInFileManager: (path: string) => Promise<{ success: boolean }>;
  openInTerminal: (path: string) => Promise<{ success: boolean }>;
  getActiveFiles: (projectPath: string, agentCwds: string[]) => Promise<{ files: ActiveFile[] }>;
}

export type FiletreeFilter = 'all' | 'changed' | 'staged' | 'unstaged';

export interface ActiveFile {
  path: string;
  relativePath: string;
  modifiedAt: number;
}
