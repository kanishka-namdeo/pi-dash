import type { ComponentType } from 'react';

interface EmptyStatePanelProps {
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaIcon?: ComponentType<{ className?: string }>;
  onCtaClick?: () => void;
}

export function EmptyStatePanel({
  icon: Icon,
  iconColor,
  title,
  description,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
}: EmptyStatePanelProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4" style={{ color: iconColor }}>
        <Icon className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {ctaLabel && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          {CtaIcon && <CtaIcon className="h-4 w-4" />}
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
