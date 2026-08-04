import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, Plus } from 'lucide-react';

type Worktree = {
  id: string;
  name: string;
  branch: string;
  path: string;
  agentId: string | null;
  status: 'active' | 'idle' | 'error';
};

const mockWorktrees: Worktree[] = [
  {
    id: '1',
    name: 'main-worktree',
    branch: 'main',
    path: '/home/user/project/main',
    agentId: null,
    status: 'idle',
  },
  {
    id: '2',
    name: 'feature-auth',
    branch: 'feature/auth',
    path: '/home/user/project/feature-auth',
    agentId: 'claude',
    status: 'active',
  },
  {
    id: '3',
    name: 'feature-api',
    branch: 'feature/api',
    path: '/home/user/project/feature-api',
    agentId: 'cursor',
    status: 'active',
  },
  {
    id: '4',
    name: 'fix-tests',
    branch: 'fix/tests',
    path: '/home/user/project/fix-tests',
    agentId: 'copilot',
    status: 'active',
  },
];

export function WorktreeView() {
  const navigate = useNavigate();

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
        <h1 className="text-lg font-medium text-[#e5e5e5]">Git Worktrees</h1>
        <button className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Worktree</span>
        </button>
      </div>

      {/* Worktree List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {mockWorktrees.map((worktree) => (
            <div
              key={worktree.id}
              className="p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-[#737373]" />
                  <div>
                    <h3 className="text-sm font-medium text-[#e5e5e5]">{worktree.name}</h3>
                    <p className="text-xs font-mono text-[#737373]">{worktree.path}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs ${
                  worktree.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : worktree.status === 'idle'
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {worktree.status}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#737373]">Branch:</span>
                  <span className="text-xs font-mono text-[#a3a3a3]">{worktree.branch}</span>
                </div>

                {worktree.agentId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#737373]">Agent:</span>
                    <button
                      onClick={() => navigate(`/agent/${worktree.agentId}`)}
                      className="text-xs text-blue-500 hover:text-blue-400"
                    >
                      {worktree.agentId}
                    </button>
                  </div>
                ) : (
                  <button className="text-xs text-[#737373] hover:text-[#a3a3a3]">
                    Assign Agent
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
