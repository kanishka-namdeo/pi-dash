import type { ScreenName } from '../../types';

// ponytail: inline registry — same 5 agents as ResultsScreen, no separate module
const POPULAR_AGENTS = [
  {
    id: 'omp',
    name: 'Oh My Pile (OMP)',
    description: 'AI coding assistant with unified agent dashboard',
    gradient: 'from-indigo-500 to-purple-600',
    symbol: 'π',
    url: 'https://ohmypile.com',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor built for speed',
    gradient: 'from-cyan-500 to-blue-600',
    symbol: '⌘',
    url: 'https://cursor.sh',
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    gradient: 'from-emerald-500 to-teal-600',
    symbol: 'A',
    url: 'https://aider.chat',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    description: 'AI code generation from OpenAI',
    gradient: 'from-orange-500 to-red-600',
    symbol: 'C',
    url: 'https://openai.com/index/openai-codex/',
  },
  {
    id: 'continue',
    name: 'Continue',
    description: 'Open-source AI coding assistant',
    gradient: 'from-violet-500 to-fuchsia-600',
    symbol: '▶',
    url: 'https://continue.dev',
  },
];

function openExternal(url: string) {
  if (window.api?.openExternal) {
    window.api.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

interface NoAgentsScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function NoAgentsScreen({ onNavigate }: NoAgentsScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-3xl font-bold text-white">No Agents Found</h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            We couldn't detect any AI coding agents on your system.
            You can download one below, add an agent manually, or scan again.
          </p>
        </div>

        {/* Popular agents */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Popular AI Coding Agents</h2>
          <div className="grid gap-3">
            {POPULAR_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center shrink-0`}
                >
                  <span className="text-white font-bold text-lg">{agent.symbol}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{agent.name}</p>
                  <p className="text-sm text-slate-400">{agent.description}</p>
                </div>
                <button
                  onClick={() => openExternal(agent.url)}
                  className="shrink-0 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  aria-label={`Download ${agent.name}`}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add an agent manually"
          >
            Add Manually
          </button>
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Scan again for agents"
          >
            Scan Again
          </button>
        </div>
      </div>
    </div>
  );
}
