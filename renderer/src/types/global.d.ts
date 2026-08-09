// TypeScript declarations for Electron preload API exposed via contextBridge

import type { AgentConfig, ScanResult, ValidationResult, IdentificationResult } from './index';
import type { SessionAPI } from './session';
import type { Repo, GitHubIssue, GitHubPR, Worktree, PollingState } from '../../../src/shared/github-types';
import type { SettingsSchema } from '../../../src/main/settings/settings-types';
import type { Project, CloneError } from './project-setup';


interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubAuthAPI {
  getState: () => Promise<{ isAuthenticated: boolean; user: GitHubUser | null; method: 'oauth' | 'pat' | null }>;
  startOAuth: () => Promise<void>;
  loginWithPAT: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface GitHubReposAPI {
  getAll: () => Promise<{ repos: Repo[]; activeRepo: Repo | null }>;
  add: (owner: string, name: string, localPath: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setActive: (id: number | null) => Promise<void>;
}

interface GitHubDataAPI {
  fetchIssues: (owner: string, repo: string) => Promise<GitHubIssue[]>;
  fetchPRs: (owner: string, repo: string) => Promise<GitHubPR[]>;
  fetchBranches: (owner: string, repo: string) => Promise<string[]>;
}

interface GitHubIssuesAPI {
  create: (owner: string, repo: string, title: string, body: string, labels?: string[], assignees?: string[]) => Promise<GitHubIssue>;
  comment: (owner: string, repo: string, issueNumber: number, body: string) => Promise<void>;
}

interface GitHubPRsAPI {
  create: (owner: string, repo: string, title: string, body: string, head: string, base: string) => Promise<GitHubPR>;
  review: (owner: string, repo: string, prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) => Promise<void>;
}

interface GitHubAPI {
  auth: GitHubAuthAPI;
  repos: GitHubReposAPI;
  data: GitHubDataAPI;
  issues: GitHubIssuesAPI;
  prs: GitHubPRsAPI;
  // Legacy methods (kept for backward compatibility)
  authGetUser: () => Promise<GitHubUser | null>;
  authOAuth: () => Promise<{ success: boolean }>;
  authPAT: (token: string) => Promise<{ success: boolean }>;
  authLogout: () => Promise<{ success: true }>;
  repoList: () => Promise<Repo[]>;
  repoAdd: (owner: string, name: string, localPath: string) => Promise<Repo>;
  repoRemove: (id: number) => Promise<{ success: true }>;
  repoGetActive: () => Promise<Repo | null>;
  repoSetActive: (id: number) => Promise<{ success: true }>;
  dataIssues: (owner: string, repo: string) => Promise<GitHubIssue[]>;
  dataPRs: (owner: string, repo: string) => Promise<GitHubPR[]>;
}

interface WorktreeAPI {
  list: (repoPath: string) => Promise<Worktree[]>;
  create: (repoPath: string, branch: string, baseBranch: string, issueNumber?: number) => Promise<Worktree>;
}

interface AgentGitHubAPI {
  createPR(worktreePath: string, title: string, body: string): Promise<{ number: number; url: string }>;
  commentIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<{ success: boolean }>;
  readFeedback(owner: string, repo: string, prNumber: number): Promise<Array<{ user: string; body: string }>>;
  assign(worktreeId: string, agentId: string): Promise<void>;
}

declare global {
  interface Window {
    api: {
      platform: string;
      versions: NodeJS.ProcessVersions;
      cwd: string;
      scanAgents: () => Promise<ScanResult>;
      validateAgent: (path: string) => Promise<ValidationResult>;
      identifyAgent: (path: string) => Promise<IdentificationResult>;
      getAgents: () => Promise<AgentConfig[]>;
      saveAgents: (agents: AgentConfig[]) => Promise<void>;
      completeOnboarding: () => Promise<void>;
      findAgentInPath: (binary: string) => Promise<{ found: boolean; path?: string }>;
      openExternal: (url: string) => void;
      openDirectory: () => Promise<string | null>;
      getProjects(): Promise<Project[]>;
      addProject(project: Project): Promise<void>;
      updateProject(path: string, updates: Partial<Project>): Promise<void>;
      removeProject(path: string): Promise<void>;
      getRecentProjects(limit?: number): Promise<Project[]>;
      isGitRepo(path: string): Promise<boolean>;
      cloneRepository(url: string, dest: string, branch?: string): Promise<{ success: boolean; error?: CloneError }>;
      onCloneProgress(callback: (progress: number) => void): () => void;
      session: SessionAPI;
      github: GitHubAPI;
      worktree: WorktreeAPI;
      agentGitHub: AgentGitHubAPI;
      settings: {
        getAll: () => Promise<SettingsSchema>;
        set: (path: string, value: unknown) => Promise<{ success: true }>;
        reset: () => Promise<{ success: true }>;
        export: () => Promise<SettingsSchema>;
        import: (data: SettingsSchema) => Promise<{ success: true }>;
      };
      onShortcut: (callback: (action: string) => void) => () => void;
      search: {
        getRecent: () => Promise<Array<{ term: string; timestamp: number }>>;
        addRecent: (term: string) => Promise<{ success: boolean; error?: string }>;
        clearRecent: () => Promise<{ success: boolean }>;
      };
    };
  }
}

export {};
