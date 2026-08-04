import { useState, useEffect, useRef } from 'react';
import type { Agent } from '@/types/dashboard';
import { seedAgents } from '@/data/mockData';

export function useAgentSimulation() {
  const [agents, setAgents] = useState<Agent[]>(seedAgents);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = window.setInterval(() => {
        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.status === 'active' && agent.progress < 100) {
              const increment = Math.floor(Math.random() * 5) + 1;
              const newProgress = Math.min(100, agent.progress + increment);
              return {
                ...agent,
                progress: newProgress,
                status: newProgress >= 100 ? 'idle' : 'active',
              };
            }
            return agent;
          })
        );
      }, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);
  const stop = () => {
    setIsPaused(false);
    setAgents(seedAgents);
  };
  const reset = () => {
    setIsPaused(false);
    setAgents(seedAgents);
  };

  return { agents, pause, resume, stop, reset };
}
