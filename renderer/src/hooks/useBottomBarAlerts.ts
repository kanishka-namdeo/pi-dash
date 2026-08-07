import { useState, useMemo } from 'react';

export type AlertType = 'agent-error' | 'rate-limit' | 'github-auth' | 'plan-progress';

export interface AgentErrorAlert {
  type: 'agent-error';
  agentId: string;
  message: string;
}

export interface RateLimitAlert {
  type: 'rate-limit';
  provider: string;
  percentUsed: number;
  resetsIn: number; // seconds
}

export interface GitHubAuthAlert {
  type: 'github-auth';
}

export interface PlanProgressAlert {
  type: 'plan-progress';
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export type BottomBarAlert = AgentErrorAlert | RateLimitAlert | GitHubAuthAlert | PlanProgressAlert;

interface UseBottomBarAlertsOptions {
  agentError?: { agentId: string; message: string };
  rateLimit?: { provider: string; percentUsed: number; resetsIn: number };
  githubAuthExpired?: boolean;
  planProgress?: { currentStep: number; totalSteps: number; stepName: string };
}

export function useBottomBarAlerts(options: UseBottomBarAlertsOptions = {}) {
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());

  const alert = useMemo<BottomBarAlert | null>(() => {
    // Priority: error > rate-limit > github-auth > plan-progress
    if (options.agentError && !dismissed.has('agent-error')) {
      return { type: 'agent-error', ...options.agentError };
    }
    if (options.rateLimit && !dismissed.has('rate-limit')) {
      return { type: 'rate-limit', ...options.rateLimit };
    }
    if (options.githubAuthExpired && !dismissed.has('github-auth')) {
      return { type: 'github-auth' };
    }
    if (options.planProgress && !dismissed.has('plan-progress')) {
      return { type: 'plan-progress', ...options.planProgress };
    }
    return null;
  }, [options, dismissed]);

  const dismiss = () => {
    if (alert) {
      setDismissed(prev => new Set(prev).add(alert.type));
    }
  };

  return { alert, dismiss };
}
