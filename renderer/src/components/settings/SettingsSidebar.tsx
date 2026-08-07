import { Settings, Bot, Github, Bell, Keyboard, Info, Terminal, GitBranch, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'worktrees', label: 'Worktrees', icon: GitBranch },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="flex w-[280px] flex-col gap-1 border-r border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <span className="mb-2 font-mono text-[11px] font-semibold tracking-widest text-[#666]">
        SETTINGS
      </span>

      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
            activeTab === id
              ? 'bg-[#4f46e5] font-semibold text-white'
              : 'text-[#888] hover:bg-[#2a2a2a] hover:text-white'
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </button>
      ))}

      <div className="my-2 h-px w-full bg-[#2a2a2a]" />
      <span className="font-mono text-[11px] text-[#666]">PiDash v0.1.0</span>
    </div>
  );
}
