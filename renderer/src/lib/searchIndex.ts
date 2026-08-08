import Fuse from 'fuse.js';
import type { AgentConfig } from '../../../src/shared/types';
import type { SessionInfo } from '../context/SessionContext';
import type { Repo, GitHubPR } from '../../../src/shared/github-types';

export type SearchItem = {
  id: string;
  type: 'agent-running' | 'agent-available' | 'repo' | 'pr' | 'branch' | 'route' | 'action';
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  route?: string;
  action?: string;
  keywords?: string[];
};

export type SearchIndexConfig = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  repos: Repo[];
  prs: GitHubPR[];
  branches: string[];
};

const ROUTE_ITEMS: SearchItem[] = [
  { id: 'route-dashboard', type: 'route', title: 'Dashboard', description: 'Main fleet view', icon: 'layout-dashboard', iconColor: '$text-secondary', route: '/' },
  { id: 'route-terminal', type: 'route', title: 'Terminal', description: 'Full-screen terminal', icon: 'terminal', iconColor: '$text-secondary', route: '/terminal' },
  { id: 'route-settings', type: 'route', title: 'Settings', description: 'App configuration', icon: 'settings', iconColor: '$text-secondary', route: '/settings' },
  { id: 'route-worktrees', type: 'route', title: 'Worktrees', description: 'Git worktree management', icon: 'git-branch', iconColor: '$text-secondary', route: '/worktrees' },
];

export function buildSearchItems(config: SearchIndexConfig): SearchItem[] {
  const items: SearchItem[] = [];

  for (const session of config.runningSessions) {
    items.push({
      id: `agent-running-${session.agentId}`,
      type: 'agent-running',
      title: session.agentId,
      description: `Running · ${session.cwd}`,
      icon: 'bot',
      iconColor: '$accent-amber',
      route: `/agent/${session.agentId}`,
      keywords: [session.cwd],
    });
  }

  for (const agent of config.availableAgents) {
    const isRunning = config.runningSessions.some(s => s.agentId === agent.id);
    if (isRunning) continue;
    items.push({
      id: `agent-available-${agent.id}`,
      type: 'agent-available',
      title: agent.name,
      description: `Available · ${agent.path}`,
      icon: 'bot',
      iconColor: '$accent-emerald',
      action: `launch:${agent.id}`,
      keywords: [agent.path, agent.name],
    });
  }

  for (const repo of config.repos) {
    items.push({
      id: `repo-${repo.id}`,
      type: 'repo',
      title: `${repo.owner}/${repo.name}`,
      description: repo.localPath,
      icon: 'repo',
      iconColor: '$accent-blue',
      route: '/settings/github',
      keywords: [repo.name, repo.owner],
    });
  }

  for (const pr of config.prs) {
    items.push({
      id: `pr-${pr.number}`,
      type: 'pr',
      title: `PR #${pr.number}`,
      description: pr.title,
      icon: 'git-pull-request',
      iconColor: pr.state === 'open' ? '$accent-emerald' : '$accent-indigo',
      route: `/pr/${pr.number}`,
      keywords: [pr.title, String(pr.number)],
    });
  }

  for (const branch of config.branches) {
    items.push({
      id: `branch-${branch}`,
      type: 'branch',
      title: branch,
      description: 'Branch',
      icon: 'git-branch',
      iconColor: '$accent-blue',
      route: '/worktrees',
      keywords: [branch],
    });
  }

  items.push(...ROUTE_ITEMS);

  return items;
}

export function createSearchEngine(items: SearchItem[]): Fuse<SearchItem> {
  return new Fuse(items, {
    keys: ['title', 'description', 'keywords'],
    threshold: 0.3,
    includeScore: true,
  });
}
