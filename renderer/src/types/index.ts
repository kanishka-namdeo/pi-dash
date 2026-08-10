// Re-export dashboard types
export type { Agent, Activity, FeedEvent, Mode, PlanStep } from './dashboard';

// Re-export shared onboarding types from main process
export type {
  AgentConfig,
  AgentsStore,
  ScanResult,
  ScanProgress,
  ValidationResult,
  IdentificationResult,
  KnownAgent,
  ScreenName,
  ExportedConfig,
} from '../../../src/shared/types';
