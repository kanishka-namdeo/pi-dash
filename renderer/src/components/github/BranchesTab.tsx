import { useState } from 'react';
import { GitBranch, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import type { Worktree } from '../../../../src/shared/github-types';

export function BranchesTab() {
  // ponytail: worktree IPC not yet exposed in preload; tab renders empty until wired
  const [worktrees] = useState<Worktree[]>([]);

  if (worktrees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No active worktrees</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {worktrees.map(wt => (
        <div key={wt.id} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <GitBranch className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium font-mono truncate">{wt.branch}</div>
              {wt.issueNumber && (
                <div className="text-xs text-muted-foreground mt-1">
                  Issue #{wt.issueNumber}
                </div>
              )}
              {wt.agentId && (
                <div className="text-xs text-muted-foreground">
                  Agent: {wt.agentId}
                </div>
              )}
              {wt.uncommittedChanges && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                  <AlertCircle className="h-3 w-3" />
                  Uncommitted changes
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="flex-1 rounded-md">Open</Button>
            <Button size="sm" variant="outline" className="flex-1 rounded-md">PR</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
