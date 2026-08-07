import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@/context/SessionContext';
import { useAgents } from '@/hooks/useAgents';
import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { usePiPContext } from '@/context/PiPContext';
import type { PlanStep } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';
import { TopBar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';

// Mock plan data
const mockSteps: PlanStep[] = [
  { id: '1', number: 1, name: 'Scaffold project structure', agentId: 'omp', status: 'done', duration: '2m 14s' },
  { id: '2', number: 2, name: 'Implement authentication', agentId: 'claude-code', status: 'done', duration: '5m 32s' },
  { id: '3', number: 3, name: 'Build API endpoints', agentId: 'omp', status: 'active', duration: '3m 45s' },
  { id: '4', number: 4, name: 'Write unit tests', agentId: 'codex', status: 'pending', duration: '' },
  { id: '5', number: 5, name: 'Deploy to staging', agentId: 'aider', status: 'pending', duration: '' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const ctx = useSessionContext();
  const { agents: availableAgents } = useAgents();
  const { events, isPaused, pause, resume, clear } = useRealActivityFeed();
  const { mode, setMode } = useDashboardMode();
  const { actions: pipActions } = usePiPContext();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [elapsed, setElapsed] = useState(0);

  const runningSessions = ctx.getActiveSessions();

  // Compute elapsed from earliest active session
  useEffect(() => {
    if (runningSessions.length === 0) {
      setElapsed(0);
      return;
    }

    const earliest = Math.min(...runningSessions.map((s) => s.createdAt));
    const tick = () => setElapsed(Math.floor((Date.now() - earliest) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
    try {
      await window.api.launchAgent(agentId);
    } catch (error) {
      console.error('Failed to launch agent:', error);
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

  // Compute progress from mock steps
  const doneSteps = mockSteps.filter((s) => s.status === 'done').length;
  const progress = Math.round((doneSteps / mockSteps.length) * 100);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <TopBar
        mode={mode}
        viewMode={viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={runningSessions.length > 0}
        onModeChange={setMode}
        onSetViewMode={setViewMode}
        onToggleFeedPause={handlePause}
        onClearFeed={clear}
      />

      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          runningSessions={runningSessions}
          availableAgents={availableAgents}
          onFocus={handleAgentClick}
          onLaunch={handleLaunch}
          onOpenAsOverlay={handleOpenAsOverlay}
        />

        <PlanPanel steps={mockSteps} progress={progress} />

        <ActivityFeed events={events} isPaused={isPaused} />
      </div>

      <MetricsFooter
        elapsed={elapsed}
        activeAgents={activeAgents}
        totalCommands={totalCommands}
      />
    </div>
  );
}
