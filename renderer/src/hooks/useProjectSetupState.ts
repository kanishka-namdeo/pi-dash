import { useState, useCallback } from 'react';
import type { ScreenName, ProjectSetupState } from '../types/project-setup';

function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || filePath;
}

function getInitialState(flowMode: 'full' | 'condensed'): ProjectSetupState {
  return {
    currentScreen: 'project-selection',
    flowMode,
    projectPath: null,
    projectName: null,
    githubConnected: false,
    githubUser: null,
    githubRepoUrl: null,
    cloneStatus: 'idle',
    cloneProgress: 0,
    cloneError: null,
    cloneDestinationExists: false,
    selectedAgents: [],
    validationErrors: {},
    pendingAgents: [],
    agentScopeChoice: null,
  };
}

export function useProjectSetupState(flowMode: 'full' | 'condensed' = 'full') {
  const [state, setState] = useState<ProjectSetupState>(() => getInitialState(flowMode));

  const navigate = useCallback((screen: ScreenName) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  const updateProject = useCallback((projectPath: string) => {
    setState(prev => ({
      ...prev,
      projectPath,
      projectName: basename(projectPath),
    }));
  }, []);

  const updateSelectedAgents = useCallback((agents: string[]) => {
    setState(prev => ({ ...prev, selectedAgents: agents }));
  }, []);

  const complete = useCallback(async (onComplete?: () => void) => {
    try {
      await window.api.addProject({
        path: state.projectPath!,
        name: state.projectName!,
        addedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        selectedAgents: state.selectedAgents,
        githubUrl: state.githubRepoUrl || undefined,
        isGitRepo: state.projectPath ? await window.api.isGitRepo(state.projectPath) : false,
        projectAgents: [],
      });
      onComplete?.();
    } catch (error) {
      if (error instanceof Error && error.message === 'PROJECT_ALREADY_EXISTS') {
        navigate('project-already-added');
      }
    }
  }, [state, navigate]);

  return {
    ...state,
    navigate,
    updateProject,
    updateSelectedAgents,
    complete,
  };
}
