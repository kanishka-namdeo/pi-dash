import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '@/hooks/useAgents';
import { agentConfigToAgent } from '@/utils/agentMapper';
import { useAgentSimulation } from '@/hooks/useAgentSimulation';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { usePiPContext } from '@/context/PiPContext';
import { Topbar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';
import { AgentDetailPanel } from './AgentDetailPanel';

export function Dashboard() {
  const navigate = useNavigate();
  const { agents: realAgents, loading: agentsLoading } = useAgents();
  const mappedAgents = useMemo(() => realAgents.map(agentConfigToAgent), [realAgents]);
  const { agents, pause, resume, reset } = useAgentSimulation(mappedAgents);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'plan' | 'activity'>('plan');
  const { activities, clear: clearActivities } = useActivityFeed(agents, isPaused);
  const { mode, setMode } = useDashboardMode();
  const { elapsed, start, reset: resetTimer } = useElapsedTimer();
  const { state: pipState, actions: pipActions } = usePiPContext();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAgentId) {
        setSelectedAgentId(undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgentId]);

  useEffect(() => {
    if (!agentsLoading) {
      setIsLoading(false);
    }
  }, [agentsLoading]);

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
  const progress = agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length) : 0;
  const tokens = Math.floor(elapsed * 150);

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
        <Topbar
          mode={mode}
          viewMode={pipState.viewMode}
          isFeedPaused={isPaused}
          hasMainAgent={pipState.mainAgentId !== null}
          onModeChange={setMode}
          onToggleViewMode={pipActions.toggleViewMode}
          onToggleFeedPause={handlePause}
          onClearFeed={clearActivities}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-[#737373]">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Topbar
        mode={mode}
        viewMode={pipState.viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={pipState.mainAgentId !== null}
        onModeChange={setMode}
        onToggleViewMode={pipActions.toggleViewMode}
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
      <div className="flex flex-1 overflow-hidden max-w-[1920px] mx-auto w-full">


        <aside aria-label="Agent fleet" className={`${activeTab === 'fleet' ? 'block' : 'hidden'} md:block w-full md:w-80 border-r border-[#2a2a2a]`}>
          <FleetPanel
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onAgentClick={handleAgentClick}
            onLaunch={handleLaunch}
            onOpenAsOverlay={handleOpenAsOverlay}
          />
        </aside>

        {/* Plan Panel */}
        <section aria-label="Active plan" className={`${activeTab === 'plan' ? 'block' : 'hidden'} md:block flex-1`}>
          <PlanPanel steps={[]} progress={progress} />
        </section>

        {/* Activity Feed */}
        <aside aria-label="Activity feed" className={`${activeTab === 'activity' ? 'block' : 'hidden'} md:block w-full md:w-96 border-l border-[#2a2a2a]`}>
          <ActivityFeed activities={activities} agents={agents} />
        </aside>
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
    </main>
  );
}
