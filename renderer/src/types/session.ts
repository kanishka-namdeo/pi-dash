import type { AgentConfig as BaseAgentConfig } from '../../../src/shared/types';

export type SessionState = 'idle' | 'working' | 'waiting' | 'paused' | 'killed';

export type CommandBlock = {
  id: string;
  command: string;           // Raw command text (no ANSI)
  timestamp: number;         // Unix ms
  output: string;            // Raw output with ANSI codes (single string, may contain \n)
  isMultiLine: boolean;      // output.includes('\n')
  isCollapsed: boolean;      // UI-only, NOT persisted
};

export type SessionData = {
  state: SessionState;
  history: Omit<CommandBlock, 'isCollapsed'>[];  // Strip ephemeral state before persist
  createdAt: number;
  lastActiveAt: number;
};

export type AgentConfig = BaseAgentConfig & {
  task?: string;
  session?: SessionData;
};
