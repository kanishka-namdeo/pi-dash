interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex h-12 items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <span className="text-[13px] text-[#888]">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function RowSeparator() {
  return <div className="h-px w-full bg-[#2a2a2a]" />;
}
