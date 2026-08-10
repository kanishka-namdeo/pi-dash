import { useState, useEffect } from 'react';
import { useAgents } from '../../../hooks/useAgents';
import { AgentScopeDialog } from '../AgentScopeDialog';
import { findNewAgents } from '../../../utils/agentScope';
import type { AgentConfig } from '../../../../../src/shared/types';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  selectedAgents: string[];
  updateSelectedAgents: (agents: string[]) => void;
  navigate: (screen: ScreenName) => void;
  complete: (onComplete?: () => void) => void;
  completeWithScopedAgents: (scopeChoice: 'global' | 'project', agents: AgentConfig[], onComplete?: () => void) => void;
  setPendingAgents: (agents: AgentConfig[]) => void;
  setAgentScopeChoice: (choice: 'global' | 'project' | null) => void;
  onComplete?: () => void;
}

export function SelectAgentsScreen({ selectedAgents, updateSelectedAgents, navigate, complete, completeWithScopedAgents, setPendingAgents, setAgentScopeChoice, onComplete }: ScreenProps) {
  const { agents } = useAgents();
  const [globalAgents, setGlobalAgents] = useState<AgentConfig[]>([]);
  const [showScopeDialog, setShowScopeDialog] = useState(false);

  useEffect(() => {
    window.api.getAgents().then(setGlobalAgents);
  }, []);

  const scannedAgents = agents.filter(a => selectedAgents.includes(a.id));
  const newAgents = findNewAgents(scannedAgents, globalAgents);

  const toggleAgent = (agentId: string) => {
    const updated = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    updateSelectedAgents(updated);
  };

  const handleContinue = () => {
    if (newAgents.length > 0) {
      setPendingAgents(newAgents);
      setShowScopeDialog(true);
    } else {
      complete(onComplete);
    }
  };

  const handleAddToGlobal = (agentsToAdd: AgentConfig[]) => {
    setShowScopeDialog(false);
    completeWithScopedAgents('global', agentsToAdd, onComplete);
  };

  const handleAddToProject = (agentsToAdd: AgentConfig[]) => {
    setShowScopeDialog(false);
    completeWithScopedAgents('project', agentsToAdd, onComplete);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Select Agents</h1>
          <p className="text-muted-foreground">Choose which agents to use with this project</p>
        </div>
        <div className="space-y-2">
          {agents.map(agent => {
            const isNew = newAgents.some(na => na.id === agent.id);
            return (
              <label key={agent.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer">
                <input type="checkbox" checked={selectedAgents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
                <span className="font-medium">{agent.name}</span>
                {isNew && <span title="New agent">🆕</span>}
                <span className="text-sm text-muted-foreground ml-auto">{agent.path}</span>
              </label>
            );
          })}
        </div>
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            disabled={selectedAgents.length === 0}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            Continue ({selectedAgents.length})
          </button>
          <button onClick={() => navigate('scanning-for-agents')} className="w-full h-12 text-muted-foreground">← Back</button>
        </div>
      <AgentScopeDialog
        open={showScopeDialog}
        agents={newAgents}
        onAddToGlobal={handleAddToGlobal}
        onAddToProject={handleAddToProject}
        onCancel={() => setShowScopeDialog(false)}
      />
      </div>
    </div>
  );
}
