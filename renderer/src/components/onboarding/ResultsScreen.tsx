import type { AgentConfig, ScreenName } from '../../types';

// ponytail: inline registry — 5 agents, no need for a separate module yet
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: {
    gradient: 'from-indigo-500 to-purple-600',
    symbol: 'π',
  },
  cursor: {
    gradient: 'from-cyan-500 to-blue-600',
    symbol: '⌘',
  },
  aider: {
    gradient: 'from-emerald-500 to-teal-600',
    symbol: 'A',
  },
  codex: {
    gradient: 'from-orange-500 to-red-600',
    symbol: 'C',
  },
  continue: {
    gradient: 'from-violet-500 to-fuchsia-600',
    symbol: '▶',
  },
};

interface ResultsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  toggleAgent: (agentId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

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

export function ResultsScreen({
  onNavigate,
  agents,
  selectedAgents,
  toggleAgent,
  selectAll,
  deselectAll,
}: ResultsScreenProps) {
  const allSelected = agents.length > 0 && selectedAgents.length === agents.length;
  const noneSelected = selectedAgents.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {agents.length > 0 ? 'Agents Detected' : 'No Agents Found'}
          </h1>
          <p className="text-slate-400">
            {agents.length > 0
              ? `We found ${agents.length} agent${agents.length === 1 ? '' : 's'}. Select the ones to add.`
              : "We didn't detect any agents. You can add them manually."}
          </p>
        </div>

        {/* Agent list */}
        {agents.length > 0 && (
          <div className="space-y-3">
            {/* Select controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded px-2 py-1 transition-colors"
                  aria-label="Select all agents"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={noneSelected}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded px-2 py-1 transition-colors"
                  aria-label="Deselect all agents"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-sm text-slate-500">
                {selectedAgents.length} / {agents.length} selected
              </span>
            </div>

            {/* Agent items */}
            <ul
              className="space-y-2 max-h-72 overflow-y-auto pr-1"
              role="list"
              aria-label="Detected agents list"
            >
              {agents.map((agent) => {
                const checked = selectedAgents.includes(agent.id);
                return (
                  <li key={agent.id}>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 ${
                        checked
                          ? 'bg-indigo-900/30 border-indigo-600'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAgent(agent.id)}
                        className="sr-only"
                        aria-label={`Select ${agent.name}`}
                      />
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-slate-500 bg-slate-800'
                        }`}
                        aria-hidden="true"
                      >
                        {checked && (
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <AgentIcon iconKey={agent.icon} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate">{agent.name}</div>
                        <div className="text-sm text-slate-400 truncate" title={agent.path}>
                          {agent.path}
                        </div>
                      </div>
                      {agent.source === 'manual' && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full shrink-0">
                          manual
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onNavigate('ready')}
            disabled={noneSelected}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={noneSelected ? 'Select at least one agent to continue' : 'Continue with selected agents'}
          >
            Continue ({selectedAgents.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add an agent manually"
          >
            + Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}
