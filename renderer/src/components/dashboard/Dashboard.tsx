import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSessionContext } from '@/context/SessionContext';
import { useAgents } from '@/hooks/useAgents';
import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { usePiPContext } from '@/context/PiPContext';
import { useGitHub } from '@/context/GitHubContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Agent } from '@/types/dashboard';
import type { Project } from '@/types/project-setup';
import { TopBar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { TerminalPanel } from './TerminalPanel';
import { ActivityFeed } from './ActivityFeed';
import { BottomBar } from './BottomBar';
import { AddAgentDialog } from './AddAgentDialog';
import { ConfigureAgentsDialog } from './ConfigureAgentsDialog';
import { RateLimitAlert } from '../github/RateLimitAlert';
import { AgentDisconnected } from '../ui/AgentDisconnected';
import { GitHubAuthExpired } from '../github/GitHubAuthExpired';
import { ProjectSetupFlow } from '../project-setup/ProjectSetupFlow';
import { OverlayManager } from '../pip/OverlayManager';


export function Dashboard() {
  const navigate = useNavigate();
  const ctx = useSessionContext();
  const { agents: availableAgents, refresh: refreshAgents } = useAgents();
  const { events, isPaused, pause, resume, clear } = useRealActivityFeed();
  const { actions: pipActions } = usePiPContext();
  const { isAuthenticated, authExpired, clearAuthExpired, login, activeRepo } = useGitHub();
  const { settings } = useSettingsContext();
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [configureAgentsOpen, setConfigureAgentsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [disconnectedAgent, setDisconnectedAgent] = useState<string | null>(null);
  const [showProjectSetup, setShowProjectSetup] = useState(false);
  const { layout } = useResponsiveLayout();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Load active project on mount
  useEffect(() => {
    window.api.getProjects().then(projects => {
      if (projects.length > 0) {
        // Use most recently opened project
        const sorted = [...projects].sort((a, b) => 
          new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
        );
        setActiveProject(sorted[0]);
      }
    });
  }, []);

  // Smart auto-collapse panels based on viewport width
  useEffect(() => {
    setCollapsedPanels(prev => {
      const next = new Set(prev);
      const width = window.innerWidth;

      if (width < 1300) {
        next.add('activity');
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
    if (!activeProject) {
      toast.error('Select a project before launching agents');
      return;
    }

    const agent = availableAgents.find(a => a.id === agentId);
    if (!agent) return;

    const maxConcurrent = settings?.general.maxConcurrentAgents ?? 8;
    if (runningSessions.length >= maxConcurrent) {
      toast.error(`Max ${maxConcurrent} concurrent agents reached`);
      return;
    }

    try {
      const cwd = agent.cwd || activeProject.path;
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

  const handleProjectChange = useCallback(async (project: Project) => {
    if (activeProject?.path === project.path) return;
    setActiveProject(project);
    await window.api.updateProject(project.path, {
      lastOpenedAt: new Date().toISOString(),
    });
  }, [activeProject]);

  const handleAddProject = useCallback(() => {
    setShowProjectSetup(true);
  }, []);

  // Ctrl+L shortcut: launch first available agent
  useEffect(() => {
    const unsub = window.api?.onShortcut?.((action: string) => {
      if (action === 'launchAgent') {
        if (!activeProject) {
          toast.error('Select a project before launching agents');
          return;
        }
        const firstAvailable = availableAgents.find(a => !runningSessions.some(s => s.agentId === a.id));
        if (firstAvailable) {
          handleLaunch(firstAvailable.id);
        }
      }
    });
    return () => unsub?.();
  }, [availableAgents, runningSessions, handleLaunch, activeProject]);

  const handleReconnect = () => {
    if (!activeProject) {
      toast.error('Select a project before reconnecting agents');
      return;
    }
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
        onComplete={async () => {
          setShowProjectSetup(false);
          refreshAgents();
          const projects = await window.api.getProjects();
          if (projects.length > 0) {
            const sorted = [...projects].sort((a, b) =>
              new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
            );
            setActiveProject(sorted[0]);
          }
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {isAuthenticated && <RateLimitAlert />}
      <TopBar
        isFeedPaused={isPaused}
        hasMainAgent={runningSessions.length > 0}
        activeProject={activeProject}
        repoFullName={activeRepo?.fullName}
        onToggleFeedPause={handlePause}
        onClearFeed={clear}
        onProjectChange={handleProjectChange}
        onAddProject={handleAddProject}
        onProjectUpdated={async () => {
          const projects = await window.api.getProjects();
          const updated = projects.find(p => p.path === activeProject?.path);
          if (updated) setActiveProject(updated);
          refreshAgents();
        }}
      />


      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          runningSessions={runningSessions}
          availableAgents={availableAgents}
          hasActiveProject={activeProject !== null}
          onFocus={handleAgentClick}
          onLaunch={handleLaunch}
          onRestart={handleLaunch}
          onOpenAsOverlay={handleOpenAsOverlay}
          onAddAgent={() => setAddAgentOpen(true)}
          onConfigureAgents={activeProject ? () => setConfigureAgentsOpen(true) : undefined}
          selectedAgentIds={activeProject?.selectedAgents}
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


      <BottomBar />

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        onAdded={refreshAgents}
      />

      <ConfigureAgentsDialog
        open={configureAgentsOpen}
        onOpenChange={setConfigureAgentsOpen}
        activeProject={activeProject}
        availableAgents={availableAgents}
        onSaved={async (selectedAgents) => {
          if (!activeProject) return;
          await window.api.updateProject(activeProject.path, { selectedAgents });
          setActiveProject({ ...activeProject, selectedAgents });
          refreshAgents();
        }}
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

      <OverlayManager />
    </div>
  );
}
