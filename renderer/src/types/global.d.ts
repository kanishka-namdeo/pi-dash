// TypeScript declarations for Electron preload API exposed via contextBridge

import type { AgentConfig, ScanResult, ValidationResult, IdentificationResult } from './index';
import type { SessionAPI } from './session';

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
    };
  }
}

export {};
