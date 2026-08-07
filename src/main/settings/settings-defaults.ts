// src/main/settings/settings-defaults.ts

import type { SettingsSchema } from './settings-types';

export function getDefaultSettings(): SettingsSchema {
  const isWindows = process.platform === 'win32';

  return {
    general: {
      theme: 'dark',
      language: 'en',
      fontSize: 'medium',
      launchOnBoot: false,
      restoreSession: true,
      minimizeToTray: false,
      defaultWorkingDirectory: '~/projects',
      autoDetectOnLaunch: true,
      maxConcurrentAgents: 8,
    },
    github: {
      authMethod: 'pat',
      autoCreateWorktree: false,
      defaultPRTemplate: 'default',
      autoLinkCommits: true,
    },
    notifications: {
      agentStarted: true,
      agentCompleted: true,
      agentError: true,
      prReviewRequested: true,
      issueAssigned: true,
      prMerged: false,
      desktop: true,
      sound: false,
      badgeCount: true,
    },
    keyboard: {
      general: {
        openSettings: 'Ctrl+,',
        togglePiP: 'Ctrl+Shift+P',
        closeWindow: 'Ctrl+W',
        quitApp: 'Ctrl+Q',
      },
      agents: {
        launchAgent: 'Ctrl+L',
        stopAgent: 'Ctrl+Shift+X',
        nextAgent: 'Ctrl+]',
        previousAgent: 'Ctrl+Shift+[',
      },
      navigation: {
        dashboardView: 'Ctrl+1',
        terminalView: 'Ctrl+2',
        toggleSidebar: 'Ctrl+B',
      },
    },
    terminal: {
      defaultShell: isWindows ? 'powershell.exe' : '/bin/bash',
      shellArgs: isWindows ? '' : '--login',
      fontFamily: 'Geist Mono',
      fontSize: 14,
      theme: 'dark',
      scrollbackLines: 10000,
      cursorStyle: 'block',
      copyOnSelect: false,
    },
    worktrees: {
      directory: '~/.pidash/worktrees',
      autoCleanup: false,
      branchNamingPattern: 'issue-{number}',
      maxConcurrent: 10,
    },
    advanced: {
      developerMode: false,
      logLevel: 'info',
    },
  };
}
