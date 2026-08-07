import type { LucideIcon } from 'lucide-react';

interface IconBoxProps {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  size?: number;
}

export function IconBox({ icon: Icon, bgColor, iconColor, size = 40 }: IconBoxProps) {
  return (
    <div
      data-testid="icon-box"
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgColor,
      }}
    >
      <Icon size={size * 0.5} style={{ color: iconColor }} />
    </div>
  );
}
