import { useState } from 'react';
import { useAgentSimulation } from '@/hooks/useAgentSimulation';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { seedPlanSteps } from '@/data/mockData';
import { Topbar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';
import { AgentDetailPanel } from './AgentDetailPanel';

export function Dashboard() {
  const { agents, pause, resume, reset } = useAgentSimulation();
  const [isPaused, setIsPaused] = useState(false);
  const { activities } = useActivityFeed(agents, isPaused);
  const { mode, setMode } = useDashboardMode();
  const { elapsed, start, reset: resetTimer } = useElapsedTimer();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    reset();
    resetTimer();
    setIsPaused(false);
    start();
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const progress = Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length);
  const tokens = Math.floor(elapsed * 150);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Topbar
        mode={mode}
        isPaused={isPaused}
        onModeChange={setMode}
        onPause={handlePause}
        onStop={handleStop}
      />

      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
        />
        <PlanPanel steps={seedPlanSteps} progress={progress} />
        <ActivityFeed activities={activities} agents={agents} />
      </div>

      <MetricsFooter
        progress={progress}
        elapsed={elapsed}
        activeAgents={activeAgents}
        tokens={tokens}
      />

      <AgentDetailPanel
        agent={selectedAgent}
        isOpen={!!selectedAgentId}
        onClose={() => setSelectedAgentId(undefined)}
      />
    </div>
  );
}
