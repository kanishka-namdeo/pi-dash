import { createPortal } from 'react-dom';
import { Search, History, Settings, Terminal, Plus, CornerDownLeft, SearchX, LayoutDashboard, GitBranch, Bot, GitPullRequest } from 'lucide-react';
import { useCommandPalette } from '../hooks/useCommandPalette';
import type { SearchItem } from '../lib/searchIndex';

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  history: History,
  settings: Settings,
  terminal: Terminal,
  plus: Plus,
  'search-x': SearchX,
  'corner-down-left': CornerDownLeft,
  'layout-dashboard': LayoutDashboard,
  'git-branch': GitBranch,
  bot: Bot,
  repo: Search,
  'git-pull-request': GitPullRequest,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Search;
}

function ResultItem({ item, isSelected, onClick }: { item: SearchItem; isSelected: boolean; onClick: () => void }) {
  const Icon = getIcon(item.icon);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 h-11 px-4 cursor-pointer"
      style={{
        background: isSelected ? 'var(--state-hover)' : 'transparent',
        border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid transparent',
        borderRadius: isSelected ? '6px' : '0',
      }}
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Icon size={14} style={{ color: `var(${item.iconColor.replace('$', '')})` }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.description}</span>
      </div>
      {isSelected && <CornerDownLeft size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />}
    </div>
  );
}

export function CommandPalette() {
  const {
    isOpen, query, setQuery, selectedIndex, results,
    recentSearches, quickActions, inputRef,
    handleKeyDown, selectItem, close,
  } = useCommandPalette();

  if (!isOpen) return null;

  const allItems = query.trim() ? results : [];
  const showRecent = !query.trim() && recentSearches.length > 0;
  const showEmpty = !query.trim() && recentSearches.length === 0;
  const showNoResults = query.trim() && results.length === 0;

  const palette = (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      style={{ paddingTop: 120, background: '#00000080' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-[640px] rounded-xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card)', border: '2px solid var(--accent-indigo)', maxHeight: 500 }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 h-14 px-4">
          <Search size={20} style={{ color: query ? 'var(--accent-indigo)' : 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agents, repos, PRs, files..."
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
          />
          <div className="h-6 px-1.5 rounded flex items-center" style={{ background: 'var(--bg)' }}>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Ctrl+K</span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'var(--border)' }} />

        {/* Results / Recent / Empty */}
        <div className="flex flex-col overflow-y-auto py-2">
          {showRecent && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>RECENT</span>
              </div>
              {recentSearches.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-3 h-9 px-4 cursor-pointer"
                  onClick={() => setQuery(r.term)}>
                  <History size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.term}</span>
                </div>
              ))}
              <div className="h-px mx-4" style={{ background: 'var(--border)' }} />
            </>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <Search size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Start typing to search</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Search across agents, repos, PRs, branches, and files</span>
            </div>
          )}

          {query.trim() && allItems.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  RESULTS · ↑↓ navigate · ↵ select
                </span>
              </div>
              {allItems.map((item, i) => (
                <ResultItem key={item.id} item={item} isSelected={i === selectedIndex} onClick={() => selectItem(item)} />
              ))}
            </>
          )}

          {showNoResults && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <SearchX size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>No results found</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                No agents, repos, or files match &ldquo;{query}&rdquo;
              </span>
            </div>
          )}

          {/* Quick Actions */}
          {!query.trim() && (
            <>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>QUICK ACTIONS</span>
              </div>
              {quickActions.map(item => (
                <div key={item.id} className="flex items-center gap-3 h-9 px-4 cursor-pointer"
                  onClick={() => selectItem(item)}>
                  {(() => { const Icon = getIcon(item.icon); return <Icon size={14} style={{ color: 'var(--text-muted)' }} />; })()}
                  <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.description}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {query.trim() && allItems.length > 0 && (
          <>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-4 h-8 px-4">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {selectedIndex + 1} of {allItems.length}
              </span>
              <div className="flex-1" />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>↑↓ nav</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>↵ open</span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>esc close</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}
