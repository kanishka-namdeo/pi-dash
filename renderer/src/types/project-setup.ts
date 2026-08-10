import type { AgentConfig } from '../../../src/shared/types';

export type ScreenName =
  | 'project-selection'
  | 'project-selection-github-connected'
  | 'recent-projects'
  | 'recent-projects-empty'
  | 'recent-projects-loading'
  | 'project-already-added'
  | 'clone-repository'
  | 'clone-repository-validation-error'
  | 'cloning-progress'
  | 'clone-error'
  | 'clone-error-destination-exists'
  | 'github-repo-picker'
  | 'project-loading'
  | 'scanning-for-agents'
  | 'select-agents'
  | 'not-a-git-repository'
  | 'no-agents-found';

export interface Project {
  path: string;
  name: string;
  addedAt: string;
  lastOpenedAt: string;
  selectedAgents: string[];
  githubUrl?: string;
  isGitRepo: boolean;
  projectAgents: AgentConfig[];
}

export interface ProjectSetupState {
  currentScreen: ScreenName;
  projectPath: string | null;
  projectName: string | null;
  githubConnected: boolean;
  githubUser: string | null;
  githubRepoUrl: string | null;
  cloneStatus: 'idle' | 'cloning' | 'success' | 'error';
  cloneProgress: number;
  cloneError: string | null;
  cloneDestinationExists: boolean;
  selectedAgents: string[];
  validationErrors: Record<string, string>;
  flowMode: 'full' | 'condensed';
  pendingAgents: AgentConfig[];
  agentScopeChoice: 'global' | 'project' | null;
}

export type CloneError =
  | { type: 'repository-not-found'; message: string }
  | { type: 'authentication-required'; message: string }
  | { type: 'destination-exists'; path: string }
  | { type: 'network-error'; message: string }
  | { type: 'permission-denied'; path: string }
  | { type: 'unknown'; message: string };

export interface ValidationErrors {
  repoUrl?: string;
  branch?: string;
  destination?: string;
}
