interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-semibold tracking-wide text-[#888] uppercase">
        {title}
      </span>
      <div className="flex flex-col rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-4 px-5">
        {children}
      </div>
    </div>
  );
}
