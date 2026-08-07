import type { PlanStep } from '@/types/dashboard';
import { StepItem } from './StepItem';

type PlanPanelProps = {
  steps: PlanStep[];
  progress: number;
};

export function PlanPanel({ steps, progress }: PlanPanelProps) {
  return (
    <section
      className="flex-1 flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Active Plan
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {steps.length} steps
        </span>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Progress section */}
      <div
        className="px-4 py-3"
        style={{ borderTop: `1px solid var(--border)` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Progress
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--text-primary)' }}
          >
            {progress}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--accent-emerald)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
