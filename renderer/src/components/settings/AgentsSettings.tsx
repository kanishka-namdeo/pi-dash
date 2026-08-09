import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Search } from 'lucide-react';
import type { AgentConfig } from '../../types';
import { SectionCard } from './SectionCard';
import { useAgentScanner } from '../../hooks/useAgentScanner';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-violet-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AgentsSettings() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await window.api.getAgents();
        if (!cancelled) setAgents(list);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { scan: revalidate, result: validationResult, isScanning: isValidating } =
    useAgentScanner({ mode: 'revalidate', existingAgents: agents });

  const { scan: incrementalScan, isScanning: isScanningForAgents } =
    useAgentScanner({ mode: 'incremental', existingAgents: agents });

  const getStatus = (agentId: string) => {
    const validation = validationResult?.validations?.find(v => v.agent.id === agentId);
    if (!validation) return null;
    return validation.status;
  };

  const handleRemove = async (id: string) => {
    const next = agents.filter((a) => a.id !== id);
    setAgents(next);
    await window.api.saveAgents(next);
  };

  const handleAdd = async () => {
    const dir = await window.api.openDirectory();
    if (!dir) return;
    const name = dir.split(/[\\/]/).filter(Boolean).pop() ?? dir;
    const newAgent: AgentConfig = {
      id: crypto.randomUUID(),
      name,
      icon: 'custom',
      path: dir,
      source: 'manual',
    };
    const next = [...agents, newAgent];
    setAgents(next);
    await window.api.saveAgents(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Agents</h2>
        <p className="text-sm text-[#888]">Manage your configured AI coding agents</p>
      </div>

      <SectionCard title="CONFIGURED AGENTS">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-[#888]">Loading agents…</div>
        ) : agents.length === 0 ? (
          <div className="py-4 text-center text-sm text-[#888]">No agents configured yet.</div>
        ) : (
          <div className="flex flex-col">
            {agents.map((agent, idx) => (
              <div
                key={agent.id}
                className={`flex h-14 items-center gap-3 rounded-lg px-3 ${idx > 0 ? 'border-t border-[#2a2a2a]' : ''}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(agent.name)}`}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-white">{agent.name}</span>
                  <span className="truncate font-mono text-xs text-[#888]">{agent.path}</span>
                </div>
                {(() => {
                  const status = getStatus(agent.id);
                  const icon = status === 'valid' ? '🟢' : status === 'moved' ? '🟡' : status === 'missing' ? '🔴' : null;
                  if (icon) {
                    return <span className="shrink-0 text-base" title={status ?? undefined}>{icon}</span>;
                  }
                  return (
                    <span className="shrink-0 rounded-full bg-[#2a2a2a] px-2 py-0.5 text-xs text-[#888]">
                      Disconnected
                    </span>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleRemove(agent.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#888] transition-colors hover:bg-[#2a2a2a] hover:text-rose-400"
                  aria-label={`Remove ${agent.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {agents.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => revalidate()}
              disabled={isValidating}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#2a2a2a] px-3 text-sm font-medium text-white transition-colors hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />
              {isValidating ? 'Validating...' : 'Re-validate All'}
            </button>
            <button
              type="button"
              onClick={() => incrementalScan()}
              disabled={isScanningForAgents}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#2a2a2a] px-3 text-sm font-medium text-white transition-colors hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              <Search size={14} />
              {isScanningForAgents ? 'Scanning...' : 'Scan for Agents'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-indigo-400 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/5"
        >
          <Plus size={16} />
          Add Agent
        </button>
      </SectionCard>
    </div>
  );
}
