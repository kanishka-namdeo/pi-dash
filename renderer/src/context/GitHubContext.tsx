import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Repo, GitHubIssue, GitHubPR } from '../../../src/shared/github-types';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubContextType {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  repos: Repo[];
  activeRepo: Repo | null;
  issues: GitHubIssue[];
  prs: GitHubPR[];
  login: (method: 'oauth' | 'pat', token?: string) => Promise<void>;
  logout: () => Promise<void>;
  addRepo: (owner: string, name: string, localPath: string) => Promise<void>;
  removeRepo: (id: number) => Promise<void>;
  setActiveRepo: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | null>(null);

export function GitHubProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepo, setActiveRepoState] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [prs, setPrs] = useState<GitHubPR[]>([]);

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    if (activeRepo) {
      loadDataForRepo(activeRepo);
    }
  }, [activeRepo?.id]);

  async function loadInitialState() {
    const userData = await window.api.github.authGetUser();
    if (userData) {
      setIsAuthenticated(true);
      setUser(userData);
    }

    const reposData = await window.api.github.repoList();
    setRepos(reposData);

    const activeRepoData = await window.api.github.repoGetActive();
    setActiveRepoState(activeRepoData);
  }

  async function loadDataForRepo(repo: Repo) {
    const [issuesData, prsData] = await Promise.all([
      window.api.github.dataIssues(repo.owner, repo.name),
      window.api.github.dataPRs(repo.owner, repo.name)
    ]);
    setIssues(issuesData);
    setPrs(prsData);
  }

  async function login(method: 'oauth' | 'pat', token?: string) {
    if (method === 'oauth') {
      const result = await window.api.github.authOAuth();
      if (result.success) {
        const userData = await window.api.github.authGetUser();
        setIsAuthenticated(true);
        setUser(userData);
      }
    } else if (method === 'pat' && token) {
      const result = await window.api.github.authPAT(token);
      if (result.success) {
        const userData = await window.api.github.authGetUser();
        setIsAuthenticated(true);
        setUser(userData);
      }
    }
  }

  async function logout() {
    await window.api.github.authLogout();
    setIsAuthenticated(false);
    setUser(null);
    setRepos([]);
    setActiveRepoState(null);
    setIssues([]);
    setPrs([]);
  }

  async function addRepo(owner: string, name: string, localPath: string) {
    const repo = await window.api.github.repoAdd(owner, name, localPath);
    setRepos(prev => [...prev, repo]);
  }

  async function removeRepo(id: number) {
    await window.api.github.repoRemove(id);
    setRepos(prev => prev.filter(r => r.id !== id));
    if (activeRepo?.id === id) {
      setActiveRepoState(null);
    }
  }

  async function setActiveRepo(id: number) {
    await window.api.github.repoSetActive(id);
    const repo = repos.find(r => r.id === id);
    setActiveRepoState(repo || null);
  }

  async function refresh() {
    if (activeRepo) {
      await loadDataForRepo(activeRepo);
    }
  }

  return (
    <GitHubContext.Provider value={{
      isAuthenticated,
      user,
      repos,
      activeRepo,
      issues,
      prs,
      login,
      logout,
      addRepo,
      removeRepo,
      setActiveRepo,
      refresh
    }}>
      {children}
    </GitHubContext.Provider>
  );
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within GitHubProvider');
  }
  return context;
}
