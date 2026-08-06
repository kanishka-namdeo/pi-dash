// TypeScript declarations for Electron preload API exposed via contextBridge

import type { AgentConfig, ScanResult, ValidationResult, IdentificationResult } from './index';
import type { SessionAPI } from './session';
import type { Repo, GitHubIssue, GitHubPR } from '../../../src/shared/github-types';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubAPI {
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

declare global {
  interface Window {
    api: {
      platform: string;
      versions: NodeJS.ProcessVersions;
      scanAgents: () => Promise<ScanResult>;
      validateAgent: (path: string) => Promise<ValidationResult>;
      identifyAgent: (path: string) => Promise<IdentificationResult>;
      getAgents: () => Promise<AgentConfig[]>;
      saveAgents: (agents: AgentConfig[]) => Promise<void>;
      completeOnboarding: () => Promise<void>;
      getOnboardingStatus: () => Promise<boolean>;
      launchAgent: (id: string) => Promise<{ pid: number }>;
      openExternal: (url: string) => void;
      openDirectory: () => Promise<string | null>;
      session: SessionAPI;
      github: GitHubAPI;
    };
  }
}

export {};
