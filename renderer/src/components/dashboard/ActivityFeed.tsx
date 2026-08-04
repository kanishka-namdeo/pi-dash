import type { Activity, Agent } from '@/types/dashboard';

type ActivityFeedProps = {
  activities: Activity[];
  agents: Agent[];
};

const actionColors: Record<string, string> = {
  read: 'bg-blue-500/20 text-blue-500',
  write: 'bg-emerald-500/20 text-emerald-500',
  edit: 'bg-violet-500/20 text-violet-500',
  test: 'bg-amber-500/20 text-amber-500',
  lint: 'bg-gray-500/20 text-gray-500',
  plan: 'bg-blue-500/20 text-blue-500',
};

export function ActivityFeed({ activities, agents }: ActivityFeedProps) {
  const getAgent = (agentId: string) => agents.find((a) => a.id === agentId);

  return (
    <aside className="w-[320px] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Activity</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.map((activity) => {
          const agent = getAgent(activity.agentId);
          if (!agent) return null;

          return (
            <div
              key={activity.id}
              className="px-4 py-3 border-b border-[#1a1a1a] animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#737373] pt-0.5">{activity.time}</span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{ background: agent.color, color: agent.textColor }}
                >
                  {agent.short}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionColors[activity.action]}`}>
                      {activity.action}
                    </span>
                  </div>
                  <div className="text-xs text-[#a3a3a3] mb-1">{activity.description}</div>
                  {activity.file && (
                    <div className="text-[10px] font-mono text-[#737373] truncate">{activity.file}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
