import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentSimulation } from '@/hooks/useAgentSimulation';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { usePiPContext } from '@/context/PiPContext';
import { seedPlanSteps } from '@/data/mockData';
import { Topbar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';
import { AgentDetailPanel } from './AgentDetailPanel';

export function Dashboard() {
  const navigate = useNavigate();
  const { agents, pause, resume, reset } = useAgentSimulation();
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'plan' | 'activity'>('plan');
  const { activities, clear: clearActivities } = useActivityFeed(agents, isPaused);
  const { mode, setMode } = useDashboardMode();
  const { elapsed, start, reset: resetTimer } = useElapsedTimer();
  const { state: pipState, actions: pipActions } = usePiPContext();
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

  const handleAgentClick = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const handleOpenAsOverlay = (agentId: string) => {
    pipActions.addOverlay(agentId);
  };

  const handleLaunch = async (agentId: string) => {
    const cwd = await window.api.openDirectory();
    if (cwd) {
      navigate(`/agent/${agentId}?cwd=${encodeURIComponent(cwd)}`);
    }
  };

  const handleViewCompletedWork = (agentId: string) => {
    navigate(`/completed/${agentId}`);
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const progress = Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length);
  const tokens = Math.floor(elapsed * 150);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Topbar
        mode={mode}
        viewMode={pipState.viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={pipState.mainAgentId !== null}
        onModeChange={setMode}
        onSetViewMode={pipActions.setViewMode}
        onToggleFeedPause={handlePause}
        onClearFeed={clearActivities}
      />

      {/* Mobile tab bar */}
      <div className="flex md:hidden border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex-1 px-4 py-2 text-sm ${
            activeTab === 'fleet'
              ? 'text-[#e5e5e5] border-b-2 border-blue-500'
              : 'text-[#737373]'
          }`}
        >
          Fleet
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 px-4 py-2 text-sm ${
            activeTab === 'plan'
              ? 'text-[#e5e5e5] border-b-2 border-blue-500'
              : 'text-[#737373]'
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 px-4 py-2 text-sm ${
            activeTab === 'activity'
              ? 'text-[#e5e5e5] border-b-2 border-blue-500'
              : 'text-[#737373]'
          }`}
        >
          Activity
        </button>
      </div>

        <div className={`${activeTab === 'fleet' ? 'block' : 'hidden'} md:block w-full md:w-80 border-r border-[#2a2a2a]`}>
          <FleetPanel
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAgentClick={handleAgentClick}
            onLaunch={handleLaunch}
            onOpenAsOverlay={handleOpenAsOverlay}
          />
        </div>

        {/* Plan Panel */}
        <div className={`${activeTab === 'plan' ? 'block' : 'hidden'} md:block flex-1`}>
          <PlanPanel steps={seedPlanSteps} progress={progress} />
        </div>

        {/* Activity Feed */}
        <div className={`${activeTab === 'activity' ? 'block' : 'hidden'} md:block w-full md:w-96 border-l border-[#2a2a2a]`}>
          <ActivityFeed />
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
        onViewCompletedWork={handleViewCompletedWork}
      />
    </div>
  );
}
