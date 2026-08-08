// src/main/settings/settings-types.ts

export interface SettingsSchema {
  general: {
    theme: 'dark' | 'light' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    launchOnBoot: boolean;
    restoreSession: boolean;
    minimizeToTray: boolean;
    defaultWorkingDirectory: string;
    autoDetectOnLaunch: boolean;
    maxConcurrentAgents: number;
  };
  notifications: {
    agentStarted: boolean;
    agentCompleted: boolean;
    agentError: boolean;
    prReviewRequested: boolean;
    issueAssigned: boolean;
    prMerged: boolean;
    desktop: boolean;
    sound: boolean;
    badgeCount: boolean;
  };
  keyboard: {
    general: {
      openSettings: string;
      togglePiP: string;
      closeWindow: string;
      quitApp: string;
    };
    agents: {
      launchAgent: string;
      stopAgent: string;
      nextAgent: string;
      previousAgent: string;
    };
    navigation: {
      dashboardView: string;
      terminalView: string;
      toggleSidebar: string;
      openCommandPalette: string;
    };
  };
  search: {
    recent: Array<{ term: string; timestamp: number }>;
  };
  terminal: {
    defaultShell: string;
    shellArgs: string;
    fontFamily: string;
    fontSize: number;
    theme: string;
    scrollbackLines: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    copyOnSelect: boolean;
  };
  worktrees: {
    directory: string;
    branchNamingPattern: string;
  };
  advanced: {
    developerMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export type SettingsPath = string; // e.g., 'general.theme'
