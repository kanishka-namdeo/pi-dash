import { useGitHub } from '../../context/GitHubContext';
import { CheckCircle2 } from 'lucide-react';

export function PRsTab() {
  const { prs } = useGitHub();

  if (prs.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No open pull requests</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {prs.map(pr => (
        <div key={pr.number} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                #{pr.number} {pr.title}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {pr.head.ref} → {pr.base.ref}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-muted-foreground">{pr.user.login}</span>
                <span className="text-emerald-500">+{pr.additions}</span>
                <span className="text-rose-500">-{pr.deletions}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
