import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSessionContext } from '@/context/SessionContext';
import { useAgents } from '@/hooks/useAgents';
import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { usePiPContext } from '@/context/PiPContext';
import { useGitHub } from '@/context/GitHubContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { PlanStep, Agent } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';
import { TopBar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { TerminalPanel } from './TerminalPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { BottomBar } from './BottomBar';
import { AddAgentDialog } from './AddAgentDialog';
import { AgentDetailPanel } from './AgentDetailPanel';
import { RateLimitAlert } from '../github/RateLimitAlert';
import { AgentDisconnected } from '../ui/AgentDisconnected';
import { GitHubAuthExpired } from '../github/GitHubAuthExpired';
import { ProjectSetupFlow } from '../project-setup/ProjectSetupFlow';

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
  const { agents: availableAgents, refresh: refreshAgents } = useAgents();
  const { events, isPaused, pause, resume, clear } = useRealActivityFeed();
  const { mode, setMode } = useDashboardMode();
  const { actions: pipActions } = usePiPContext();
  const { isAuthenticated, authExpired, clearAuthExpired, login } = useGitHub();
  const { settings } = useSettingsContext();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [disconnectedAgent, setDisconnectedAgent] = useState<string | null>(null);
  const [showProjectSetup, setShowProjectSetup] = useState(false);
  const { layout } = useResponsiveLayout();

  // Smart auto-collapse panels based on viewport width
  useEffect(() => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      const width = window.innerWidth;

      if (width < 1300) {
        next.add('activity');
        next.add('plan');
      } else if (width < 1400) {
        next.add('plan');
      }
      // At 1440px+: don't auto-expand — respect user's manual collapse

      return next;
    });
  }, [layout]);

  const toggleCollapse = useCallback((panel: string) => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  }, []);
  const prevRunningRef = useRef<Set<string>>(new Set());

  const runningSessions = ctx.getActiveSessions();

  // Detect sessions that transitioned from running to exited unexpectedly
  useEffect(() => {
    const currentRunning = new Set<string>();
    const exited: string[] = [];

    for (const [, session] of ctx.sessions) {
      if (session.state === 'running') {
        currentRunning.add(session.agentId);
      } else if (session.state === 'exited' && prevRunningRef.current.has(session.agentId)) {
        exited.push(session.agentId);
      }
    }

    if (exited.length > 0 && !disconnectedAgent) {
      setDisconnectedAgent(exited[0]);
    }

    prevRunningRef.current = currentRunning;
  }, [ctx.sessions, disconnectedAgent]);

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleLaunch = async (agentId: string) => {
    const agent = availableAgents.find(a => a.id === agentId);
    if (!agent) return;

    const maxConcurrent = settings?.general.maxConcurrentAgents ?? 8;
    if (runningSessions.length >= maxConcurrent) {
      toast.error(`Max ${maxConcurrent} concurrent agents reached`);
      return;
    }

    try {
      const cwd = agent.cwd || settings?.general.defaultWorkingDirectory || await window.api.cwd();
      const result = await window.api.session.create(agentId, cwd);
      if ('error' in result) {
        toast.error(`Failed to start ${agentId}: ${result.error}`);
        return;
      }
      ctx.registerSession(agentId, result.pid, cwd);
      setSelectedAgentId(agentId);
    } catch (error) {
      console.error('Failed to launch agent:', error);
    }
  };
  const handleOpenAsOverlay = (agentId: string) => {
    pipActions.addOverlay(agentId);
  };

  // Ctrl+L shortcut: launch first available agent
  useEffect(() => {
    const unsub = window.api?.onShortcut?.((action: string) => {
      if (action === 'launchAgent') {
        const firstAvailable = availableAgents.find(a => !runningSessions.some(s => s.agentId === a.id));
        if (firstAvailable) {
          handleLaunch(firstAvailable.id);
        }
      }
    });
    return () => unsub?.();
  }, [availableAgents, runningSessions, handleLaunch]);

  const handleReconnect = () => {
    if (disconnectedAgent) {
      handleLaunch(disconnectedAgent);
      setDisconnectedAgent(null);
    }
  };

  const handleViewLastOutput = () => {
    if (disconnectedAgent) {
      navigate(`/agent/${disconnectedAgent}`);
      setDisconnectedAgent(null);
    }
  };

  const hasAgents = availableAgents.length > 0;

  // Compute progress from mock steps
  const doneSteps = mockSteps.filter((s) => s.status === 'done').length;
  const progress = Math.round((doneSteps / mockSteps.length) * 100);
  // Map a running session to Agent shape for the detail panel
  const sessionToAgent = (s: typeof runningSessions[number]): Agent => ({
    id: s.agentId,
    name: availableAgents.find(a => a.id === s.agentId)?.name ?? s.agentId,
    short: s.agentId.slice(0, 1).toUpperCase(),
    color: availableAgents.find(a => a.id === s.agentId)?.color ?? '#6366f1',
    textColor: availableAgents.find(a => a.id === s.agentId)?.textColor ?? '#ffffff',
    status: s.state === 'running' ? 'active' : 'exited',
    task: '',
    progress: 0,
    path: s.cwd,
  });

  const selectedAgent = selectedAgentId
    ? availableAgents.find(a => a.id === selectedAgentId) ?? (() => {
        const s = runningSessions.find(s => s.agentId === selectedAgentId);
        return s ? sessionToAgent(s) : undefined;
      })()
    : undefined;

  if (showProjectSetup) {
    return (
      <ProjectSetupFlow
        flowMode="condensed"
        onComplete={() => {
          setShowProjectSetup(false);
          refreshAgents();
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {isAuthenticated && <RateLimitAlert />}
      <TopBar
        mode={mode}
        viewMode={viewMode}
        isFeedPaused={isPaused}
        hasMainAgent={runningSessions.length > 0}
        onModeChange={setMode}
        onSetViewMode={setViewMode}
        onToggleFeedPause={handlePause}
        onClearFeed={clear}
        onAddAgent={() => setAddAgentOpen(true)}
      />
      <div className="flex items-center px-6 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowProjectSetup(true)}
          className="px-3 py-1.5 text-sm rounded-md transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          + Add Project
        </button>
      </div>


      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          runningSessions={runningSessions}
          availableAgents={availableAgents}
          onFocus={handleAgentClick}
          onLaunch={handleLaunch}
          onRestart={handleLaunch}
          onOpenAsOverlay={handleOpenAsOverlay}
          onAddAgent={() => setAddAgentOpen(true)}
          isCollapsed={collapsedPanels.has('fleet')}
          onToggleCollapse={() => toggleCollapse('fleet')}
        />

        <TerminalPanel
          agentId={selectedAgentId}
          agentName={selectedAgent?.name}
          onClose={() => setSelectedAgentId(null)}
        />

        <ActivityFeed
          events={events}
          isPaused={isPaused}
          hasAgents={hasAgents}
          onAddAgent={() => setAddAgentOpen(true)}
          isCollapsed={collapsedPanels.has('activity')}
          onToggleCollapse={() => toggleCollapse('activity')}
        />
      </div>

      <PlanPanel
        steps={mockSteps}
        progress={hasAgents ? progress : 0}
        isCollapsed={collapsedPanels.has('plan')}
        onToggleCollapse={() => toggleCollapse('plan')}
      />

      <BottomBar />

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        onAdded={refreshAgents}
      />

      <AgentDetailPanel
        agent={selectedAgent}
        isOpen={selectedAgentId !== null}
        onClose={() => setSelectedAgentId(null)}
        onViewCompletedWork={(agentId) => navigate(`/completed/${agentId}`)}
      />

      {disconnectedAgent && (
        <AgentDisconnected
          agentId={disconnectedAgent}
          onReconnect={handleReconnect}
          onViewOutput={handleViewLastOutput}
        />
      )}

      {authExpired && (
        <GitHubAuthExpired
          onReauth={() => { clearAuthExpired(); login('oauth'); }}
          onUsePAT={() => { clearAuthExpired(); navigate('/settings/github'); }}
        />
      )}
    </div>
  );
}
