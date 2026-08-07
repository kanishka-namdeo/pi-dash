import { Search } from 'lucide-react';
import type { ScreenName } from '../../types';
import { AgentCard } from '../ui/AgentCard';

const POPULAR_AGENTS = [
  {
    id: 'omp',
    name: 'Oh My Pile (OMP)',
    description: 'AI coding assistant with unified agent dashboard',
    icon: 'omp',
    gradient: 'from-indigo-500 to-purple-600',
    url: 'https://ohmypile.com',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor built for speed',
    icon: 'cursor',
    gradient: 'from-cyan-500 to-blue-600',
    url: 'https://cursor.sh',
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    icon: 'aider',
    gradient: 'from-emerald-500 to-teal-600',
    url: 'https://aider.chat',
  },
];

interface NoAgentsScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function NoAgentsScreen({ onNavigate }: NoAgentsScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header with search icon */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Search size={28} className="text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">No Agents Found</h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            We couldn't detect any AI coding agents on your system.
            You can download one below, add an agent manually, or scan again.
          </p>
        </div>

        {/* Popular agents using AgentCard */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Popular AI Coding Agents</h2>
          <div className="grid gap-3">
            {POPULAR_AGENTS.map((agent) => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                description={agent.description}
                icon={agent.icon}
                gradient={agent.gradient}
                url={agent.url}
              />
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
