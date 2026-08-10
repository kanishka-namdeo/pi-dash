// Stub implementation - EmptyStatePanel
interface EmptyStatePanelProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyStatePanel({ icon, title, description, action }: EmptyStatePanelProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
