import { useSearchParams, useNavigate, Routes, Route } from 'react-router-dom';
import { SettingsSidebar } from './SettingsSidebar';
import { GeneralSettings } from './GeneralSettings';
import { AgentsSettings } from './AgentsSettings';
import { GitHubSettings } from './GitHubSettings';
import { NotificationsSettings } from './NotificationsSettings';
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings';
import { TerminalSettings } from './TerminalSettings';
import { WorktreesSettings } from './WorktreesSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { AboutSettings } from './AboutSettings';
import { ResetRecoverySettings } from './ResetRecoverySettings';
import { X } from 'lucide-react';

export function SettingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'general';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto p-8">
        <button
          onClick={handleClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a]"
        >
          <X className="h-4 w-4 text-[#888]" />
        </button>
        <Routes>
          <Route path="/" element={<GeneralSettings />} />
          <Route path="/agents" element={<AgentsSettings />} />
          <Route path="/github" element={<GitHubSettings />} />
          <Route path="/notifications" element={<NotificationsSettings />} />
          <Route path="/keyboard" element={<KeyboardShortcutsSettings />} />
          <Route path="/terminal" element={<TerminalSettings />} />
          <Route path="/worktrees" element={<WorktreesSettings />} />
          <Route path="/advanced" element={<AdvancedSettings />} />
          <Route path="/about" element={<AboutSettings />} />
          <Route path="/reset" element={<ResetRecoverySettings />} />
        </Routes>
      </div>
    </div>
  );
}
