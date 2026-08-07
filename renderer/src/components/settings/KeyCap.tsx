interface KeyCapProps {
  label: string;
}

export function KeyCap({ label }: KeyCapProps) {
  return (
    <div className="flex h-6 items-center justify-center rounded border border-[#2a2a2a] bg-[#0a0a0a] px-2">
      <span className="font-mono text-[13px] text-white">{label}</span>
    </div>
  );
}
