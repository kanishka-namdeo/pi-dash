import { useState, useCallback } from 'react';
import type { AgentConfig, ScreenName } from '../../types';

// ponytail: inline registry — same 5 agents as ResultsScreen/NoAgentsScreen
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
};

function AgentIcon({ iconKey }: { iconKey: string }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
        <span className="text-slate-400 text-lg">?</span>
      </div>
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}
    >
      <span className="text-white font-bold text-lg">{entry.symbol}</span>
    </div>
  );
}

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
    if (isSaving) return;
    setIsSaving(true);
    try {
      const selected = agents.filter((a) => selectedAgents.includes(a.id));
      await window.api.saveAgents(selected);
      await window.api.completeOnboarding();
      onComplete?.();
      setIsComplete(true);
    } catch {
      // ponytail: surface a minimal error; full error boundary when one exists
      alert('Failed to save your setup. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [agents, selectedAgents, isSaving, onComplete]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl" role="img" aria-label="success">✅</div>
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
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">✓</span>
          </div>
          <h1 className="text-4xl font-bold text-white">You&apos;re All Set!</h1>
          <p className="text-lg text-slate-400">
            {selectedList.length === 1
              ? '1 agent ready to go'
              : `${selectedList.length} agents ready to go`}
          </p>
        </div>

        {/* Selected agents list */}
        {selectedList.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Your Agents</h2>
            <ul className="space-y-3" role="list" aria-label="Selected agents">
              {selectedList.map((agent) => (
                <li
                  key={agent.id}
                  className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-3"
                >
                  <AgentIcon iconKey={agent.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{agent.name}</p>
                    <p className="text-sm text-slate-400 truncate">{agent.path}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      agent.source === 'detected'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {agent.source === 'detected' ? 'Detected' : 'Added'}
                  </span>
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
