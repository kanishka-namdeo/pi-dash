import { CheckCircle, AlertCircle } from 'lucide-react';

interface StatusIconProps {
  type: 'success' | 'error';
  size?: number;
}

export function StatusIcon({ type, size = 64 }: StatusIconProps) {
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  const color = type === 'success' ? '#10b981' : '#f43f5e';

  return (
    <div
      data-testid="status-icon"
      style={{ width: `${size}px`, height: `${size}px`, color }}
    >
      <Icon size={size} />
    </div>
  );
}
