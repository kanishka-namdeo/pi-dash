import { X } from 'lucide-react';
import type { Agent } from '@/types/dashboard';

type AgentDetailPanelProps = {
  agent?: Agent;
  isOpen: boolean;
  onClose: () => void;
};

export function AgentDetailPanel({ agent, isOpen, onClose }: AgentDetailPanelProps) {
  if (!agent) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-[320px] bg-[#0a0a0a] border-l border-[#2a2a2a] z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: agent.color, color: agent.textColor }}
            >
              {agent.short}
            </div>
            <div>
              <div className="text-sm text-[#e5e5e5] font-medium">{agent.name}</div>
              <div className="text-xs text-[#737373]">Code specialist</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#737373] hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="text-xs text-[#737373] mb-2">Current task</div>
            <div className="text-sm text-[#e5e5e5]">{agent.task}</div>
          </div>

          <div>
            <div className="text-xs text-[#737373] mb-2">Progress</div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden mb-1">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${agent.progress}%`, background: agent.textColor }}
              />
            </div>
            <div className="text-xs font-mono text-[#a3a3a3]">{agent.progress}%</div>
          </div>

          {agent.files && agent.files.length > 0 && (
            <div>
              <div className="text-xs text-[#737373] mb-2">Files touched</div>
              <div className="space-y-1">
                {agent.files.map((file, i) => (
                  <div key={i} className="text-xs font-mono text-[#a3a3a3] bg-[#1a1a1a] px-2 py-1 rounded">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {agent.messages && agent.messages.length > 0 && (
            <div>
              <div className="text-xs text-[#737373] mb-2">Messages</div>
              <div className="space-y-2">
                {agent.messages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-[#737373] pt-0.5">{msg.time}</span>
                    <span className="text-xs text-[#a3a3a3]">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
