import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { seedAgents } from '@/data/mockData';
import { TerminalView } from '../terminal/TerminalView';

export function AgentDetailView() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = seedAgents.find(a => a.id === agentId);

  if (!agent) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-[#a3a3a3] mb-4">Agent not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:text-blue-400"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2a2a]">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
            style={{ background: agent.color, color: agent.textColor }}
          >
            {agent.short}
          </div>
          <div>
            <h1 className="text-lg font-medium text-[#e5e5e5]">{agent.name}</h1>
            <p className="text-xs text-[#737373]">{agent.task}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              agent.status === 'active' ? 'bg-emerald-500 animate-pulse' :
              agent.status === 'idle' ? 'bg-amber-500' : 'bg-gray-500'
            }`} />
            <span className="text-sm text-[#a3a3a3] capitalize">{agent.status}</span>
          </div>
          <div className="text-sm font-mono text-[#a3a3a3]">{agent.progress}%</div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 overflow-hidden">
        <TerminalView agentId={agent.id} />
      </div>
    </div>
  );
}
