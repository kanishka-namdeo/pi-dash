import { useState, useCallback } from 'react';
import type { AgentConfig, ScreenName } from '../../types';
import { StatusIcon } from '../ui/StatusIcon';
import { AgentRow } from '../ui/AgentRow';

interface ReadyScreenProps {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  onComplete?: () => void;
}

export function ReadyScreen({ onNavigate, agents, selectedAgents, onComplete }: ReadyScreenProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedList = agents.filter((a) => selectedAgents.includes(a.id));

  const handleOpenDashboard = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save agents and complete onboarding
      if (onComplete) {
        await onComplete();
      }
      setIsComplete(true);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSaving(false);
    }
  }, [agents, selectedAgents, isSaving, onComplete]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <StatusIcon type="success" size={64} />
          </div>
          <h1 className="text-4xl font-bold text-white">Setup Complete!</h1>
          <p className="text-lg text-slate-300">
            Your agents are saved. Launch the dashboard to start managing them.
          </p>
          <div className="pt-4 space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('ready')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Open dashboard"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">
        {/* Header with StatusIcon */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <StatusIcon type="success" size={64} />
          </div>
          <h1 className="text-4xl font-bold text-white">You&apos;re All Set!</h1>
          <p className="text-lg text-slate-400">
            {selectedList.length === 1
              ? '1 agent ready to go'
              : `${selectedList.length} agents ready to go`}
          </p>
        </div>

        {/* Selected agents list using AgentRow with badges */}
        {selectedList.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Your Agents</h2>
            <ul className="space-y-3" role="list" aria-label="Selected agents">
              {selectedList.map((agent) => (
                <li key={agent.id}>
                  <AgentRow
                    name={agent.name}
                    path={agent.path}
                    icon={agent.icon}
                    gradient={agent.icon}
                    badge={agent.source === 'detected' ? 'Detected' : 'Manual'}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOpenDashboard}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Open dashboard and complete onboarding"
          >
            {isSaving ? 'Saving...' : 'Open Dashboard'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add another agent manually"
          >
            + Add Another Agent
          </button>
        </div>
      </div>
    </div>
  );
}
