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
  const [activeTab, setActiveTab] = useState<'fleet' | 'plan' | 'activity'>('plan');
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

      {/* Mobile tab bar */}
      <div className="flex md:hidden border-b border-[#2a2a2a] bg-[#0a0a0a]">
        {(['fleet', 'plan', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium capitalize ${
              activeTab === tab
                ? 'text-[#e5e5e5] border-b-2 border-blue-500'
                : 'text-[#737373]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Fleet Panel - hidden on mobile unless active tab */}
        <div className={`${activeTab === 'fleet' ? 'flex' : 'hidden'} md:flex`}>
          <FleetPanel
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />
        </div>

        {/* Plan + Activity container */}
        <div className={`flex-1 flex flex-col lg:flex-row ${activeTab === 'fleet' ? 'hidden md:flex' : 'flex'}`}>
          {/* Plan Panel */}
          <div className={`flex-1 flex flex-col ${activeTab === 'activity' ? 'hidden lg:block' : 'flex'}`}>
            <PlanPanel steps={seedPlanSteps} progress={progress} />
          </div>

          {/* Activity Feed */}
          <div className={`${activeTab === 'activity' ? 'flex' : 'hidden'} lg:flex flex-col`}>
            <ActivityFeed activities={activities} agents={agents} />
          </div>
        </div>
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
