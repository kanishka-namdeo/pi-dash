import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, GitCommit } from 'lucide-react';
import { seedAgents } from '@/data/mockData';

type FileChange = {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
};

type Commit = {
  hash: string;
  message: string;
  timestamp: string;
};

const mockFileChanges: Record<string, FileChange[]> = {
  claude: [
    { path: 'src/auth/jwt.ts', status: 'added', additions: 45, deletions: 0 },
    { path: 'src/auth/session.ts', status: 'modified', additions: 12, deletions: 3 },
    { path: 'src/middleware/auth.ts', status: 'added', additions: 28, deletions: 0 },
    { path: 'tests/auth.test.ts', status: 'added', additions: 67, deletions: 0 },
  ],
  cursor: [
    { path: 'src/routes/auth.ts', status: 'added', additions: 52, deletions: 0 },
    { path: 'src/routes/user.ts', status: 'modified', additions: 8, deletions: 2 },
    { path: 'src/validators/auth.ts', status: 'added', additions: 34, deletions: 0 },
  ],
  copilot: [
    { path: 'tests/fixtures/users.ts', status: 'added', additions: 89, deletions: 0 },
    { path: 'tests/fixtures/sessions.ts', status: 'added', additions: 45, deletions: 0 },
    { path: 'tests/auth.test.ts', status: 'modified', additions: 23, deletions: 5 },
  ],
};

const mockCommits: Record<string, Commit[]> = {
  claude: [
    { hash: 'a1b2c3d', message: 'feat: implement JWT token validation', timestamp: '2 hours ago' },
    { hash: 'e4f5g6h', message: 'feat: add session management', timestamp: '3 hours ago' },
    { hash: 'i7j8k9l', message: 'test: add auth middleware tests', timestamp: '4 hours ago' },
  ],
  cursor: [
    { hash: 'm1n2o3p', message: 'feat: create auth API routes', timestamp: '1 hour ago' },
    { hash: 'q4r5s6t', message: 'feat: add request validation', timestamp: '2 hours ago' },
  ],
  copilot: [
    { hash: 'u7v8w9x', message: 'test: generate test fixtures', timestamp: '30 minutes ago' },
    { hash: 'y1z2a3b', message: 'test: update auth tests', timestamp: '1 hour ago' },
  ],
};

const statusColors = {
  added: 'text-emerald-500',
  modified: 'text-amber-500',
  deleted: 'text-red-500',
};

export function CompletedWorkView() {
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

  const fileChanges = mockFileChanges[agentId || ''] || [];
  const commits = mockCommits[agentId || ''] || [];
  const totalAdditions = fileChanges.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = fileChanges.reduce((sum, f) => sum + f.deletions, 0);

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
            <h1 className="text-lg font-medium text-[#e5e5e5]">Completed Work</h1>
            <p className="text-xs text-[#737373]">{agent.name}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#737373]">Files:</span>
            <span className="font-mono text-[#e5e5e5]">{fileChanges.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">+{totalAdditions}</span>
            <span className="text-red-500">-{totalDeletions}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Files Changed */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a]">
              <FileText className="w-4 h-4 text-[#737373]" />
              <h2 className="text-sm font-medium text-[#e5e5e5]">Files Changed</h2>
            </div>
            <div className="divide-y divide-[#2a2a2a]">
              {fileChanges.map((file, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#1f1f1f] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono text-[#e5e5e5]">{file.path}</span>
                    <span className={`text-xs ${statusColors[file.status]}`}>
                      {file.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-500">+{file.additions}</span>
                    <span className="text-red-500">-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commits */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a]">
              <GitCommit className="w-4 h-4 text-[#737373]" />
              <h2 className="text-sm font-medium text-[#e5e5e5]">Recent Commits</h2>
            </div>
            <div className="divide-y divide-[#2a2a2a]">
              {commits.map((commit, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#1f1f1f] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#e5e5e5]">{commit.message}</span>
                    <span className="text-xs font-mono text-[#737373]">{commit.hash}</span>
                  </div>
                  <div className="text-xs text-[#737373]">{commit.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
