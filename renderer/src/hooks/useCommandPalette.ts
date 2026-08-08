import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';
import { useGitHub } from '../context/GitHubContext';
import { useAgents } from './useAgents';
import { buildSearchItems, createSearchEngine, type SearchItem } from '../lib/searchIndex';
import { log } from '../lib/logger';

type RecentSearch = { term: string; timestamp: number };

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const navigate = useNavigate();
  const { sessions, getActiveSessions, registerSession } = useSessionContext();
  const { repos, prs, branches } = useGitHub();
  const { agents } = useAgents();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.api) return;
    window.api.search.getRecent().then(setRecentSearches).catch(err =>
      log.error('command-palette', 'Failed to load recent searches', err)
    );
  }, []);

  useEffect(() => {
    if (!window.api) return;
    const unsubscribe = window.api.onShortcut((action: string) => {
      if (action === 'openCommandPalette') {
        setIsOpen(prev => !prev);
      }
    });
    return unsubscribe;
  }, []);

  const searchItems = useMemo(() => {
    return buildSearchItems({
      runningSessions: getActiveSessions(),
      availableAgents: agents,
      repos,
      prs,
      branches,
    });
  }, [sessions, agents, repos, prs, branches, getActiveSessions]);

  const fuse = useMemo(() => createSearchEngine(searchItems), [searchItems]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 20).map(r => r.item);
  }, [fuse, query]);

  const quickActions = useMemo((): SearchItem[] => [
    { id: 'action-settings', type: 'action', title: 'Open Settings', description: 'Ctrl+,', icon: 'settings', iconColor: '$text-muted', route: '/settings' },
    { id: 'action-terminal', type: 'action', title: 'Switch to Terminal', description: 'Ctrl+2', icon: 'terminal', iconColor: '$text-muted', route: '/terminal' },
    { id: 'action-add-agent', type: 'action', title: 'Add Agent', description: 'Ctrl+L', icon: 'plus', iconColor: '$text-muted', route: '/settings/agents' },
  ], []);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const saveRecent = useCallback(async (term: string) => {
    if (!window.api || !term.trim()) return;
    try {
      await window.api.search.addRecent(term.trim());
      const updated = await window.api.search.getRecent();
      setRecentSearches(updated);
    } catch (err) {
      log.error('command-palette', 'Failed to save recent search', err);
    }
  }, []);

  const selectItem = useCallback((item: SearchItem) => {
    if (query.trim()) {
      void saveRecent(query.trim());
    }
    setIsOpen(false);
    setQuery('');

    if (item.route) {
      navigate(item.route);
    } else if (item.action?.startsWith('launch:')) {
      const agentId = item.action.split(':')[1];
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;
      window.api.session.create(agentId, agent.cwd)
        .then(result => {
          if ('error' in result) {
            log.error('command-palette', `Failed to launch ${agentId}`, result.error);
            return;
          }
          registerSession(agentId, result.pid, agent.cwd);
          navigate(`/agent/${agentId}`);
        })
        .catch(err => log.error('command-palette', `Failed to launch ${agentId}`, err));
    }
  }, [navigate, query, saveRecent, agents, registerSession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allItems = query.trim() ? results : recentSearches.length > 0 ? [] : quickActions;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(allItems.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) {
          selectItem(allItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  }, [query, results, recentSearches, quickActions, selectedIndex, selectItem]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return {
    isOpen,
    query,
    setQuery,
    selectedIndex,
    results,
    recentSearches,
    quickActions,
    inputRef,
    handleKeyDown,
    selectItem,
    open,
    close,
  };
}
