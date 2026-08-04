// Re-export dashboard types
export type { Agent, Activity, Mode, PlanStep } from './dashboard';

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
} from '../../../src/shared/types';
