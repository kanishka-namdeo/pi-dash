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
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  author: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  comments: GitHubComment[];
}

export interface GitHubComment {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  createdAt: string;
  type: 'issue' | 'review' | 'pr';
  path?: string;
  line?: number;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  commits: number;
  changedFiles: number;
  ciStatus: 'passing' | 'failing' | 'pending' | 'none';
  reviews: GitHubReview[];
  comments: GitHubComment[];
}

export interface GitHubReview {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
  submittedAt: string;
}