import { ExternalLink } from 'lucide-react';

const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  claude: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
  copilot: { gradient: 'from-gray-500 to-gray-600', symbol: 'G' },
};

interface AgentCardProps {
  name: string;
  description: string;
  icon: string;
  gradient: string;
  url: string;
}

function AgentAvatar({ iconKey, size = 40 }: { iconKey: string; size?: number }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div
        className="rounded-lg bg-slate-700 flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <span className="text-slate-400 text-lg">?</span>
      </div>
    );
  }
  return (
    <div
      className={`rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}
      style={{ width: size, height: size }}
    >
      <span className="text-white text-xl font-bold">{entry.symbol}</span>
    </div>
  );
}

export function AgentCard({ name, description, icon, gradient, url }: AgentCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
      <AgentAvatar iconKey={icon} size={48} />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold">{name}</div>
        <div className="text-slate-400 text-sm mt-1">{description}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-400 text-sm mt-2 hover:text-indigo-300"
        >
          <ExternalLink size={14} />
          Download
        </a>
      </div>
    </div>
  );
}
