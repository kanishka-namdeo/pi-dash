import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/context/SessionContext';
import { useAgents } from '@/hooks/useAgents';
import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { usePiPContext } from '@/context/PiPContext';
import { TopBar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';

export function Dashboard() {
  const navigate = useNavigate();
  const ctx = useSessionContext();
  const { agents: availableAgents } = useAgents();
  const { events, isPaused, pause, resume, clear } = useRealActivityFeed();
  const { mode, setMode } = useDashboardMode();
  const { state: pipState, actions: pipActions } = usePiPContext();
  const [activeTab, setActiveTab] = useState<'fleet' | 'plan' | 'activity'>('plan');
  const [elapsed, setElapsed] = useState(0);

  const runningSessions = ctx.getActiveSessions();

  // Compute elapsed from earliest active session
  useEffect(() => {
    const active = ctx.getActiveSessions();
    if (active.length === 0) {
      setElapsed(0);
      return;
    }
    const earliest = Math.min(...active.map(s => s.createdAt));
    const update = () => setElapsed(Math.floor((Date.now() - earliest) / 1000));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [ctx.sessions]);

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleAgentClick = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const handleLaunch = async (agentId: string) => {
    const cwd = await window.api.openDirectory();
    if (cwd) {
      navigate(`/agent/${agentId}?cwd=${encodeURIComponent(cwd)}`);
    }
  };

  const handleOpenAsOverlay = (agentId: string) => {
    pipActions.addOverlay(agentId);
  };

  const activeAgents = runningSessions.length;
  const totalCommands = Array.from(ctx.sessions.values()).reduce(
    (sum, s) => sum + s.commandHistory.length,
    0,
  );

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <TopBar
        mode={mode}
        viewMode={pipState.viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={pipState.mainAgentId !== null}
        onModeChange={setMode}
        onSetViewMode={pipActions.setViewMode}
        onToggleFeedPause={handlePause}
        onClearFeed={clear}
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

      <div className="flex flex-1 overflow-hidden">
        <div className={`${activeTab === 'fleet' ? 'block' : 'hidden'} md:block w-full md:w-80 border-r border-[#2a2a2a]`}>
          <FleetPanel
            runningSessions={runningSessions}
            availableAgents={availableAgents}
            onFocus={handleAgentClick}
            onLaunch={handleLaunch}
            onOpenAsOverlay={handleOpenAsOverlay}
          />
        </div>

        {/* Plan Panel */}
        <div className={`${activeTab === 'plan' ? 'block' : 'hidden'} md:block flex-1`}>
          <PlanPanel steps={[]} progress={0} />
        </div>

        {/* Activity Feed */}
        <div className={`${activeTab === 'activity' ? 'block' : 'hidden'} md:block w-full md:w-96 border-l border-[#2a2a2a]`}>
          <ActivityFeed events={events} isPaused={isPaused} />
        </div>
      </div>

      <MetricsFooter
        elapsed={elapsed}
        activeAgents={activeAgents}
        totalCommands={totalCommands}
      />
    </div>
  );
}
