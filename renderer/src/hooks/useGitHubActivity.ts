import { useEffect, useState } from 'react';
import { useGitHub } from '../context/GitHubContext';

export interface GitHubActivityEvent {
  id: string;
  type: 'pr_created' | 'pr_merged' | 'issue_comment' | 'pr_review';
  timestamp: number;
  title: string;
  description: string;
  icon: string;
}

export function useGitHubActivity() {
  const { issues, prs, activeRepo } = useGitHub();
  const [events, setEvents] = useState<GitHubActivityEvent[]>([]);

  useEffect(() => {
    if (!activeRepo) return;

    const newEvents: GitHubActivityEvent[] = [
      ...prs.map(pr => ({
        id: `pr-${pr.number}`,
        type: 'pr_created' as const,
        timestamp: new Date(pr.createdAt).getTime(),
        title: `PR #${pr.number} created`,
        description: `${pr.user.login} opened ${pr.title}`,
        icon: 'git-pull-request'
      })),
      ...issues.map(issue => ({
        id: `issue-${issue.number}`,
        type: 'issue_comment' as const,
        timestamp: new Date(issue.updatedAt).getTime(),
        title: `Issue #${issue.number} updated`,
        description: issue.title,
        icon: 'message-circle'
      }))
    ];

    newEvents.sort((a, b) => b.timestamp - a.timestamp);
    setEvents(newEvents.slice(0, 20)); // Last 20 events
  }, [issues, prs, activeRepo]);

  return { events };
}
