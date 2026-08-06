import { useGitHub } from '../../context/GitHubContext';
import { Circle } from 'lucide-react';
import { Button } from '../ui/button';

export function IssuesTab() {
  const { issues } = useGitHub();

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No open issues</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {issues.map(issue => (
        <div key={issue.number} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <Circle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                #{issue.number} {issue.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {issue.labels.map(label => (
                  <span
                    key={label.name}
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.assignee && (
                  <span className="text-xs text-muted-foreground">
                    assigned to {issue.assignee.login}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="mt-2 rounded-md w-full">
            Create Worktree
          </Button>
        </div>
      ))}
    </div>
  );
}
