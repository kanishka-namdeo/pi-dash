import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Repo, GitHubIssue, GitHubPR, Worktree, PollingState } from '../../../src/shared/github-types';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubContextType {
  // Auth
  isAuthenticated: boolean;
  user: GitHubUser | null;
  authMethod: 'oauth' | 'pat' | null;

  // Repos
  repos: Repo[];
  activeRepo: Repo | null;

  // Data
  issues: GitHubIssue[];
  prs: GitHubPR[];
  branches: string[];
  worktrees: Worktree[];

  // Polling
  polling: PollingState;

  // Auth actions
  login: (method: 'oauth' | 'pat', token?: string) => Promise<void>;
  logout: () => Promise<void>;

  // Repo actions
  addRepo: (owner: string, name: string, localPath: string) => Promise<void>;
  removeRepo: (id: number) => Promise<void>;
  setActiveRepo: (id: number | null) => Promise<void>;

  // Data actions
  refresh: () => Promise<void>;
  createIssue: (title: string, body: string, labels?: string[], assignees?: string[]) => Promise<GitHubIssue>;
  commentOnIssue: (issueNumber: number, body: string) => Promise<void>;
  createPR: (title: string, body: string, head: string, base: string) => Promise<GitHubPR>;
  submitReview: (prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) => Promise<void>;
  createWorktree: (branch: string, baseBranch: string, issueNumber?: number) => Promise<Worktree>;
  assignAgent: (worktreeId: string, agentId: string) => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | null>(null);

export function GitHubProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'pat' | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepo, setActiveRepoState] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [polling, setPolling] = useState<PollingState>({
    isPolling: false,
    interval: 30000,
    lastSync: 0,
    remaining: 5000,
    limit: 5000,
    resetAt: 0
  });

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    if (activeRepo) {
      loadDataForRepo(activeRepo);
    }
  }, [activeRepo?.id]);

  async function loadInitialState() {
    const authState = await window.api.github.auth.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);
    setAuthMethod(authState.method);

    const reposState = await window.api.github.repos.getAll();
    setRepos(reposState.repos);
    setActiveRepoState(reposState.activeRepo);
  }

  async function loadDataForRepo(repo: Repo) {
    const [issuesData, prsData, branchesData, worktreesData] = await Promise.all([
      window.api.github.data.fetchIssues(repo.owner, repo.name),
      window.api.github.data.fetchPRs(repo.owner, repo.name),
      window.api.github.data.fetchBranches(repo.owner, repo.name),
      window.api.worktree.list(repo.localPath)
    ]);

    setIssues(issuesData);
    setPrs(prsData);
    setBranches(branchesData);
    setWorktrees(worktreesData);
  }

  async function login(method: 'oauth' | 'pat', token?: string) {
    if (method === 'oauth') {
      await window.api.github.auth.startOAuth();
    } else {
      await window.api.github.auth.loginWithPAT(token!);
    }
    await loadInitialState();
  }

  async function logout() {
    await window.api.github.auth.logout();
    setIsAuthenticated(false);
    setUser(null);
    setAuthMethod(null);
    setRepos([]);
    setActiveRepoState(null);
    setIssues([]);
    setPrs([]);
    setBranches([]);
    setWorktrees([]);
  }

  async function addRepo(owner: string, name: string, localPath: string) {
    await window.api.github.repos.add(owner, name, localPath);
    await loadInitialState();
  }

  async function removeRepo(id: number) {
    await window.api.github.repos.remove(id);
    await loadInitialState();
  }

  async function setActiveRepo(id: number | null) {
    await window.api.github.repos.setActive(id);
    const repo = repos.find(r => r.id === id) || null;
    setActiveRepoState(repo);
  }

  async function refresh() {
    if (activeRepo) {
      await loadDataForRepo(activeRepo);
    }
  }

  async function createIssue(title: string, body: string, labels?: string[], assignees?: string[]): Promise<GitHubIssue> {
    if (!activeRepo) throw new Error('No active repo');
    const issue = await window.api.github.issues.create(activeRepo.owner, activeRepo.name, title, body, labels, assignees);
    setIssues(prev => [issue, ...prev]);
    return issue;
  }

  async function commentOnIssue(issueNumber: number, body: string) {
    if (!activeRepo) throw new Error('No active repo');
    await window.api.github.issues.comment(activeRepo.owner, activeRepo.name, issueNumber, body);
    await refresh();
  }

  async function createPR(title: string, body: string, head: string, base: string): Promise<GitHubPR> {
    if (!activeRepo) throw new Error('No active repo');
    const pr = await window.api.github.prs.create(activeRepo.owner, activeRepo.name, title, body, head, base);
    setPrs(prev => [pr, ...prev]);
    return pr;
  }

  async function submitReview(prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) {
    if (!activeRepo) throw new Error('No active repo');
    await window.api.github.prs.review(activeRepo.owner, activeRepo.name, prNumber, event, body);
    await refresh();
  }

  async function createWorktree(branch: string, baseBranch: string, issueNumber?: number): Promise<Worktree> {
    if (!activeRepo) throw new Error('No active repo');
    const worktree = await window.api.worktree.create(activeRepo.localPath, branch, baseBranch, issueNumber);
    setWorktrees(prev => [worktree, ...prev]);
    return worktree;
  }

  async function assignAgent(worktreeId: string, agentId: string) {
    await window.api.agentGitHub.assign(worktreeId, agentId);
    await refresh();
  }

  return (
    <GitHubContext.Provider value={{
      isAuthenticated, user, authMethod,
      repos, activeRepo,
      issues, prs, branches, worktrees,
      polling,
      login, logout,
      addRepo, removeRepo, setActiveRepo,
      refresh, createIssue, commentOnIssue, createPR, submitReview,
      createWorktree, assignAgent
    }}>
      {children}
    </GitHubContext.Provider>
  );
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) throw new Error('useGitHub must be used within GitHubProvider');
  return context;
}
