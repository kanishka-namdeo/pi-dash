import { useAgents } from '../../../hooks/useAgents';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  selectedAgents: string[];
  updateSelectedAgents: (agents: string[]) => void;
  navigate: (screen: ScreenName) => void;
  complete: (onComplete?: () => void) => void;
}

export function SelectAgentsScreen({ selectedAgents, updateSelectedAgents, navigate, complete }: ScreenProps) {
  const { agents } = useAgents();

  const toggleAgent = (agentId: string) => {
    const updated = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    updateSelectedAgents(updated);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Select Agents</h1>
          <p className="text-muted-foreground">Choose which agents to use with this project</p>
        </div>
        <div className="space-y-2">
          {agents.map(agent => (
            <label key={agent.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer">
              <input type="checkbox" checked={selectedAgents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} />
              <span className="font-medium">{agent.name}</span>
              <span className="text-sm text-muted-foreground ml-auto">{agent.path}</span>
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <button
            onClick={() => complete()}
            disabled={selectedAgents.length === 0}
            className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            Continue ({selectedAgents.length})
          </button>
          <button onClick={() => navigate('scanning-for-agents')} className="w-full h-12 text-muted-foreground">← Back</button>
        </div>
      </div>
    </div>
  );
}
