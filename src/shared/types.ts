// Shared types for PiDash onboarding flow

export type AgentConfig = {
  id: string;
  name: string;
  icon: string;
  path: string;
  cwd: string;
  source: 'detected' | 'manual';
  fingerprint?: string;
  pid?: number;
};

export type AgentsStore = {
  version: 1;
  agents: AgentConfig[];
  lastScan: number;
  onboardingCompleted: boolean;
};

export type ScanResult = {
  agents: AgentConfig[];
  warnings: string[];
  locationsScanned: number;
  duration: number;
};

export type ScanProgress = {
  location: string;
  status: 'scanning' | 'done';
  found: number;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  executable: boolean;
  isDirectory: boolean;
};

export type IdentificationResult = {
  knownAgentId?: string;
  suggestedName: string;
  suggestedIcon: string;
  confidence: 'high' | 'medium' | 'low';
};

export type KnownAgent = {
  id: string;
  name: string;
  binaries: string[];
  icon: string;
  configPaths?: string[];
  versionFlag?: string;
};

export type ScreenName = 'welcome' | 'scanning' | 'results' | 'manual-add' | 'ready' | 'no-agents' | 'scan-error';


export type SessionState = 'idle' | 'running' | 'exited';

export type SessionInfo = {
  agentId: string;
  cwd: string;
  pid: number;
  state: SessionState;
  exitCode?: number;
};

export type SpawnParams = {
  agentId: string;
  cwd: string;
};