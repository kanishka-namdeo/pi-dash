export interface Repo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  localPath: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastSyncedAt: number;
}

export interface RepoConfig {
  repos: Repo[];
  activeRepoId: number | null;
}

export interface Worktree {
  id: string;
  repoId: number;
  path: string;
  branch: string;
  baseBranch: string;
  issueNumber?: number;
  agentId?: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastCommitAt?: number;
  uncommittedChanges: boolean;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string };
  base: { ref: string };
  user: { login: string };
  createdAt: string;
  additions?: number;
  deletions?: number;
  commits?: number;
}
