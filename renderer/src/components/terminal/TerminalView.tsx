import { useState, useEffect } from 'react';

type TerminalLine = {
  id: string;
  timestamp: string;
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
};

const mockLogs: Record<string, TerminalLine[]> = {
  claude: [
    { id: '1', timestamp: '14:02:15', type: 'info', content: 'Starting JWT token analysis...' },
    { id: '2', timestamp: '14:02:16', type: 'command', content: '$ grep -r "jwt" src/' },
    { id: '3', timestamp: '14:02:17', type: 'output', content: 'Found 3 files matching "jwt"' },
    { id: '4', timestamp: '14:02:18', type: 'output', content: '  src/auth/jwt.ts' },
    { id: '5', timestamp: '14:02:18', type: 'output', content: '  src/middleware/auth.ts' },
    { id: '6', timestamp: '14:02:19', type: 'output', content: '  src/routes/auth.ts' },
    { id: '7', timestamp: '14:02:20', type: 'command', content: '$ cat src/auth/jwt.ts' },
    { id: '8', timestamp: '14:02:21', type: 'output', content: 'Reading file contents...' },
    { id: '9', timestamp: '14:02:22', type: 'success', content: '✓ JWT structure validated' },
    { id: '10', timestamp: '14:02:23', type: 'info', content: 'Analyzing token expiration logic...' },
  ],
  cursor: [
    { id: '1', timestamp: '14:01:30', type: 'info', content: 'Creating API routes...' },
    { id: '2', timestamp: '14:01:31', type: 'command', content: '$ mkdir -p src/routes' },
    { id: '3', timestamp: '14:01:32', type: 'command', content: '$ touch src/routes/auth.ts' },
    { id: '4', timestamp: '14:01:33', type: 'output', content: 'Writing POST /api/auth/login...' },
    { id: '5', timestamp: '14:01:35', type: 'success', content: '✓ Route created successfully' },
    { id: '6', timestamp: '14:01:36', type: 'info', content: 'Adding request validation...' },
    { id: '7', timestamp: '14:01:38', type: 'command', content: '$ npm install zod' },
    { id: '8', timestamp: '14:01:40', type: 'output', content: 'Installing dependencies...' },
    { id: '9', timestamp: '14:01:45', type: 'success', content: '✓ Validation schema added' },
  ],
  copilot: [
    { id: '1', timestamp: '14:00:45', type: 'info', content: 'Generating test fixtures...' },
    { id: '2', timestamp: '14:00:46', type: 'command', content: '$ mkdir -p tests/fixtures' },
    { id: '3', timestamp: '14:00:47', type: 'output', content: 'Creating mock user data...' },
    { id: '4', timestamp: '14:00:49', type: 'success', content: '✓ 12 test fixtures generated' },
    { id: '5', timestamp: '14:00:50', type: 'command', content: '$ npm test' },
    { id: '6', timestamp: '14:00:52', type: 'output', content: 'Running test suite...' },
    { id: '7', timestamp: '14:00:55', type: 'success', content: '✓ All tests passing (12/12)' },
  ],
};

const typeColors = {
  command: 'text-blue-400',
  output: 'text-[#a3a3a3]',
  error: 'text-red-500',
  success: 'text-emerald-500',
  info: 'text-[#737373]',
};

export function TerminalView({ agentId }: { agentId: string }) {
  const [logs, setLogs] = useState<TerminalLine[]>(mockLogs[agentId] || []);
  const [autoScroll, setAutoScroll] = useState(true);

  // Simulate new log entries
  useEffect(() => {
    if (agentId !== 'claude' && agentId !== 'cursor' && agentId !== 'copilot') return;

    const interval = setInterval(() => {
      const newLog: TerminalLine = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: Math.random() > 0.7 ? 'success' : 'output',
        content: Math.random() > 0.5 ? 'Processing...' : '✓ Task completed',
      };
      setLogs(prev => [...prev, newLog]);
    }, 3000);

    return () => clearInterval(interval);
  }, [agentId]);

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs font-mono text-[#737373] ml-2">agent-{agentId}.log</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#737373]">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 mb-1">
            <span className="text-[#737373] flex-shrink-0">{log.timestamp}</span>
            <span className={typeColors[log.type]}>{log.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
