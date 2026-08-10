export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
  hasChildren?: boolean;
}

export type GitStatus = 'untracked' | 'staged' | 'modified' | 'conflict';

export interface GitStatusEntry {
  status: GitStatus;
  additions: number;
  deletions: number;
  untrackedCount?: number;
}

export interface FileContentResult {
  content: string;
  size: number;
  isBinary: boolean;
}