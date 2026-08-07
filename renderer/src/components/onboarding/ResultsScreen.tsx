import type { AgentConfig, ScreenName } from '../../types';
import { AgentRow } from '../ui/AgentRow';

interface ResultsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  toggleAgent: (agentId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
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

            {/* Agent items using AgentRow + Checkbox */}
            <ul
              className="space-y-2 max-h-72 overflow-y-auto pr-1"
              role="list"
              aria-label="Detected agents list"
            >
              {agents.map((agent) => {
                const checked = selectedAgents.includes(agent.id);
                return (
                  <li key={agent.id}>
                    <AgentRow
                      name={agent.name}
                      path={agent.path}
                      icon={agent.icon}
                      gradient={agent.icon}
                      selected={checked}
                      onToggle={() => toggleAgent(agent.id)}
                      showCheckbox={true}
                    />
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
