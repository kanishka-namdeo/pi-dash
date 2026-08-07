import { Check } from 'lucide-react';

type Step = {
  number: number;
  name: string;
  agentId: string;
  status: 'done' | 'active' | 'pending';
  duration: string;
};

type StepItemProps = {
  step: Step;
  isLast: boolean;
};

export function StepItem({ step, isLast }: StepItemProps) {
  const { number, name, agentId, status, duration } = step;

  return (
    <div className="relative flex gap-3">
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute left-4 top-8 bottom-[-16px] w-0.5"
          style={{ backgroundColor: 'var(--border)' }}
        />
      )}

      {/* Circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium"
        style={{
          backgroundColor:
            status === 'done'
              ? 'rgba(16, 185, 129, 0.2)'
              : status === 'active'
                ? 'rgba(59, 130, 246, 0.2)'
                : 'var(--card)',
          color:
            status === 'done'
              ? 'var(--accent-emerald)'
              : status === 'active'
                ? 'var(--accent-blue)'
                : 'var(--text-muted)',
          border: status === 'active' ? `2px solid var(--accent-blue)` : 'none',
        }}
      >
        {status === 'done' ? <Check size={14} /> : number}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-muted)',
            }}
          >
            {agentId}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {duration}
          </span>
        </div>
      </div>
    </div>
  );
}
