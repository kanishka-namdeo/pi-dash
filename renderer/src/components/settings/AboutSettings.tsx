import { BookOpen, CircleAlert, ExternalLink, GitHub, Globe, RefreshCw } from 'lucide-react';
import { RowSeparator } from './SettingsRow';
import { SectionCard } from './SectionCard';

const LINKS = [
  { label: 'Website', icon: Globe, url: 'https://pidash.dev' },
  { label: 'Documentation', icon: BookOpen, url: 'https://docs.pidash.dev' },
  { label: 'Source Code', icon: Github, url: 'https://github.com/pidash/pidash' },
  { label: 'Report Issue', icon: CircleAlert, url: 'https://github.com/pidash/pidash/issues' },
] as const;

function LinkRow({ label, icon: Icon, url }: { label: string; icon: React.ComponentType<{ className?: string }>; url: string }) {
  return (
    <button
      type="button"
      onClick={() => { window.api.openExternal(url); }}
      className="flex h-10 w-full items-center justify-between bg-transparent text-left hover:bg-[#222222] rounded-md px-2 -mx-2"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#888]" />
        <span className="text-sm text-white">{label}</span>
      </div>
      <ExternalLink className="h-4 w-4 text-[#666]" />
    </button>
  );
}

export function AboutSettings() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 py-8">
      {/* Logo Section */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]">
          <span className="text-4xl font-bold text-[#4f46e5]">π</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-bold text-white">PiDash</h1>
          <p className="text-lg text-[#888]">Your unified dashboard for AI coding agents</p>
          <p className="text-sm font-mono text-[#666]">Version 1.2.0 (build 2026.08.07)</p>
        </div>
      </div>

      {/* Links Section */}
      <div className="w-[480px] max-w-full">
        <SectionCard title="Links">
          <div className="flex flex-col">
            {LINKS.map((link, i) => (
              <>
                {i > 0 && <RowSeparator />}
                <LinkRow key={link.label} {...link} />
              </>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Update Section */}
      <div className="w-[480px] max-w-full">
        <SectionCard title="Update">
          <div className="flex flex-col items-center gap-4 py-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] py-3 text-sm font-medium text-white hover:bg-[#222222]"
            >
              <RefreshCw className="h-4 w-4 text-[#888]" />
              Check Updates
            </button>
            <p className="text-xs text-[#666] text-center">© 2026 PiDash. Licensed under MIT License.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
