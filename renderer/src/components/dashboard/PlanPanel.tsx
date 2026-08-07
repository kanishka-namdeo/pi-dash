import type { PlanStep } from '@/types/dashboard';
import { ListChecks, Plus, PanelBottomOpen, PanelBottomClose } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StepItem } from './StepItem';
import { EmptyStatePanel } from '../ui/EmptyStatePanel';
type PlanPanelProps = {
  steps: PlanStep[];
  progress: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function PlanPanel({ steps, progress, isCollapsed, onToggleCollapse }: PlanPanelProps) {
  const navigate = useNavigate();

  if (isCollapsed) {
    return (
      <section
        className="h-11 flex items-center px-4 gap-4"
        style={{
          backgroundColor: 'var(--bg)',
          borderTop: `1px solid var(--border)`,
        }}
      >
        <span
          className="text-sm font-semibold whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          Plan
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded whitespace-nowrap"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {steps.length} steps
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--accent-emerald)',
            }}
          />
        </div>
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
          {progress}%
        </span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            title="Expand plan"
          >
            <PanelBottomOpen size={16} />
          </button>
        )}
      </section>
    );
  }
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
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-muted)',
            }}
          >
            {steps.length} steps
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              title="Collapse plan"
            >
              <PanelBottomClose size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4">
        {steps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyStatePanel
              icon={ListChecks}
              iconColor="var(--accent-emerald)"
              title="No Active Plan"
              description="Create a plan to break down your task into manageable steps for agents."
              ctaLabel="Create Plan"
              ctaIcon={Plus}
              ctaColor="var(--accent-emerald)"
              onCta={() => navigate('/settings')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <StepItem
                key={step.id}
                step={step}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress section */}
      {steps.length > 0 && (
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
      )}
    </section>
  );
}
