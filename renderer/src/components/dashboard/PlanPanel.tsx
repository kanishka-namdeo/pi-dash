import type { PlanStep } from '@/types/dashboard';

type PlanPanelProps = {
  steps: PlanStep[];
  progress: number;
};

export function PlanPanel({ steps, progress }: PlanPanelProps) {
  return (
    <section className="flex-1 border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Active Plan</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {steps.length} steps
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-[15px] top-[32px] bottom-[-16px] w-[2px] bg-[#2a2a2a]" />
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    step.status === 'done'
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : step.status === 'active'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-[#1a1a1a] text-[#737373]'
                  }`}
                >
                  {step.number}
                </div>

                <div className="flex-1 pt-1">
                  <div className="text-sm text-[#e5e5e5] mb-1">{step.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
                      {step.agentId}
                    </span>
                    <span className="text-xs text-[#737373]">{step.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#737373]">Progress</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
