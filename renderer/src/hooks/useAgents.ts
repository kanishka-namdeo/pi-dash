import { useState, useEffect } from 'react';
import type { AgentConfig } from '../../../src/shared/types';

export function useAgents() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        if (!window.api) {
          // Browser environment - no agents available
          setAgents([]);
          setLoading(false);
          return;
        }

        const agentsList = await window.api.getAgents();
        setAgents(agentsList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load agents'));
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  return { agents, loading, error };
}
