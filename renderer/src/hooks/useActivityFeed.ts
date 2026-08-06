import { useState, useEffect, useRef, useCallback } from 'react';
import type { Activity, Agent } from '@/types/dashboard';
import { activityTemplates } from '@/data/mockData';

export function useActivityFeed(agents: Agent[], isPaused: boolean) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = window.setInterval(() => {
        const activeAgents = agents.filter((a) => a.status === 'active');
        if (activeAgents.length === 0) return;

        const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
        const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];

        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newActivity: Activity = {
          id: Date.now().toString(),
          time,
          agentId: agent.id,
          action: template.action,
          description,
          file: Math.random() > 0.3 ? 'src/example.ts' : '',
        };

        setActivities((prev) => [newActivity, ...prev].slice(0, 30));
      }, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [agents, isPaused]);

  const clear = useCallback(() => {
    setActivities([]);
  }, []);

  return { activities, clear };
}

export default useActivityFeed;
