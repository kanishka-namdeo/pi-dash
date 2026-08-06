import { useState } from 'react';
import { useGitHub } from '../../context/GitHubContext';
import { IssuesTab } from './IssuesTab';
import { PRsTab } from './PRsTab';
import { BranchesTab } from './BranchesTab';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export function GitHubPanel() {
  const { activeRepo, refresh } = useGitHub();
  const [activeTab, setActiveTab] = useState<'issues' | 'prs' | 'branches'>('issues');

  if (!activeRepo) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No repository selected. Add a repository in Settings.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a]">
        <div className="text-sm font-semibold">GITHUB</div>
        <Button variant="ghost" size="sm" onClick={refresh} className="rounded-md">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex border-b border-[#2a2a2a]">
        {(['issues', 'prs', 'branches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {tab === 'prs' ? 'PRs' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'issues' && <IssuesTab />}
        {activeTab === 'prs' && <PRsTab />}
        {activeTab === 'branches' && <BranchesTab />}
      </div>
    </div>
  );
}
