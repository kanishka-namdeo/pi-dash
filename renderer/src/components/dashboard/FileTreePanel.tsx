import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Terminal,
  X,
  Activity,
  Search,
  AlertCircle
} from 'lucide-react';
import type { Project } from '@/types/project-setup';
import type { FileEntry, GitStatusEntry, FiletreeFilter, ActiveFile } from '@/types/filetree';

type FileTreeProps = {
  activeProject: Project | null;
  onFileSelect: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

type TreeNode = FileEntry & {
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
  error?: boolean;
};

export function FileTreePanel({
  activeProject,
  onFileSelect,
  isCollapsed,
  onToggleCollapse,
}: FileTreeProps) {
  const [, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, FileEntry[]>>({});
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());
  const [gitStatus, setGitStatus] = useState<Record<string, GitStatusEntry>>({});
  const [gitStatusLoaded, setGitStatusLoaded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [filter, setFilter] = useState<FiletreeFilter>('all');
  const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; path: string } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fileTreeRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load git status on mount and auto-refresh every 30s
  useEffect(() => {
    if (!activeProject?.path) return;

    const loadGitStatus = async () => {
      try {
        const result = await window.api.filetree.getGitStatus(activeProject.path);
        setGitStatus(result.status);
        setGitStatusLoaded(true);
      } catch (err) {
        setGitStatusLoaded(false);
      }
    };

    loadGitStatus();
    const interval = setInterval(loadGitStatus, 30000);
    return () => clearInterval(interval);
  }, [activeProject?.path]);

  // Load active files every 5s
  useEffect(() => {
    if (!activeProject?.path) return;

    const loadActiveFiles = async () => {
      try {
        const activeSessions = await window.api.filetree.getActiveFiles(activeProject.path, []);
        setActiveFiles(activeSessions.files);
      } catch (err) {
        // Silent fail
      }
    };

    loadActiveFiles();
    const interval = setInterval(loadActiveFiles, 5000);
    return () => clearInterval(interval);
  }, [activeProject?.path]);

  // Load root directory on mount
  useEffect(() => {
    if (!activeProject?.path) {
      setTreeData([]);
      return;
    }

    const loadRoot = async () => {
      setIsLoading(true);
      try {
        const result = await window.api.filetree.listDir(activeProject.path);
        const treeNodes: TreeNode[] = result.entries.map(entry => ({
          ...entry,
          children: [],
          expanded: false,
        }));
        setTreeData(treeNodes);
        setChildrenCache({ [activeProject.path]: result.entries });
        setExpandedDirs(new Set([activeProject.path]));
        setIsLoading(false);
      } catch (err) {
        setLoadErrors(new Set([activeProject.path]));
        setIsLoading(false);
      }
    };

    loadRoot();
  }, [activeProject?.path]);

  // Directory git status aggregation
  const directoryStatus = useMemo(() => {
    const status: Record<string, GitStatusEntry> = {};
    if (!activeProject?.path) return status;

    for (const [relPath, entry] of Object.entries(gitStatus)) {
      const parts = relPath.split('/');
      let currentPath = activeProject.path;
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = `${currentPath}/${parts[i]}`;
        if (!status[currentPath]) {
          status[currentPath] = {
            status: 'untracked',
            additions: 0,
            deletions: 0,
            untrackedCount: 0,
          };
        }
        status[currentPath].additions += entry.additions;
        status[currentPath].deletions += entry.deletions;
        status[currentPath].untrackedCount =
          (status[currentPath].untrackedCount || 0) + (entry.untrackedCount || 0);
      }
    }

    return status;
  }, [gitStatus, activeProject?.path]);

  const getAggregatedStatus = useCallback((path: string): GitStatusEntry | undefined => {
    return directoryStatus[path];
  }, [directoryStatus]);

  const getStatusColor = useCallback((status?: GitStatusEntry) => {
    if (!status) return 'var(--text-muted)';
    if (status.status === 'conflict') return 'var(--status-conflict)';
    if (status.status === 'untracked' || status.status === 'staged') return 'var(--status-staged)';
    if (status.status === 'modified') return 'var(--status-modified)';
    return 'var(--text-muted)';
  }, []);

  const getDiffBadge = useCallback((status?: GitStatusEntry) => {
    if (!status) return null;
    const { additions, deletions, untrackedCount = 0 } = status;
    if (additions === 0 && deletions === 0 && untrackedCount === 0) return null;
    return (
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--text-muted)',
        }}
      >
        {additions > 0 && <span style={{ color: 'var(--status-staged)' }}>+{additions} </span>}
        {deletions > 0 && <span style={{ color: 'var(--status-conflict)' }}>-{deletions} </span>}
        {untrackedCount > 0 && <span style={{ color: 'var(--status-modified)' }}>*{untrackedCount}</span>}
      </span>
    );
  }, []);

  const getRelativePath = useCallback((path: string) => {
    if (!activeProject?.path) return path;
    return path.replace(activeProject.path + (path.endsWith('/') ? '' : '/'), '');
  }, [activeProject?.path]);

  // Filter and sort tree nodes
  const filteredTree = useMemo(() => {
    if (!treeData.length) return [];

    const filterFn = (entry: FileEntry): boolean => {
      if (!showHidden && entry.name.startsWith('.')) return false;
      if (filter === 'all') return true;

      const relPath = getRelativePath(entry.path);
      const status = gitStatus[relPath];

      if (!status) return filter === 'all';
      if (filter === 'changed') return status.status === 'modified' || status.status === 'conflict';
      if (filter === 'staged') return status.status === 'staged';
      if (filter === 'unstaged') return status.status === 'untracked' || status.status === 'modified';
      return true;
    };

    const buildFilteredTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter(node => {
          const relPath = getRelativePath(node.path);
          const showStatus = filter === 'all' || !gitStatusLoaded || gitStatus[relPath] ? true : filterFn(node);
          return showStatus || node.type === 'directory';
        })
        .map(node => {
          if (node.type === 'file') return { ...node };
          const children = node.children || childrenCache[node.path] || [];
          return { ...node, children: buildFilteredTree(children) };
        });
    };

    return buildFilteredTree(treeData);
  }, [treeData, showHidden, filter, gitStatus, gitStatusLoaded, childrenCache, getRelativePath]);

  const flatTree = useMemo(() => {
    const result: { node: TreeNode; depth: number; parentId: string | null }[] = [];
    const visit = (nodes: TreeNode[], depth: number, parentId: string | null) => {
      for (const node of nodes) {
        result.push({ node, depth, parentId });
        if (node.expanded && node.children) {
          visit(node.children, depth + 1, node.path);
        }
      }
    };
    visit(filteredTree, -1, null);
    return result;
  }, [filteredTree]);

  const handleToggleExpand = async (node: TreeNode) => {
    if (node.type === 'file') return;

    if (node.expanded) {
      setExpandedDirs(prev => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
      setTreeData(prev => prev.map(n => n.path === node.path ? { ...n, expanded: false } : n));
      return;
    }

    // Check if already loaded
    if (childrenCache[node.path]) {
      setExpandedDirs(prev => new Set(prev).add(node.path));
      setTreeData(prev => prev.map(n => n.path === node.path ? { ...n, expanded: true } : n));
      return;
    }

    // Load children
    if (loadErrors.has(node.path)) return;

    setTreeData(prev => prev.map(n => n.path === node.path ? { ...n, loading: true } : n));

    try {
      const result = await window.api.filetree.listDir(node.path);
      const newChildren: TreeNode[] = result.entries.map(entry => ({
        ...entry,
        children: [],
        expanded: false,
      }));

      setChildrenCache(prev => ({ ...prev, [node.path]: result.entries }));
      setExpandedDirs(prev => new Set(prev).add(node.path));
      setTreeData(prev => {
        const updated = prev.map(n => {
          if (n.path === node.path) {
            return { ...n, expanded: true, loading: false, children: newChildren };
          }
          return n;
        });
        return updated;
      });
    } catch (err) {
      setLoadErrors(prev => new Set(prev).add(node.path));
      setTreeData(prev => prev.map(n => n.path === node.path ? { ...n, loading: false, error: true } : n));
    }
  };

  const handleFileSelect = useCallback((path: string) => {
    onFileSelect(path);
    setFocusedIndex(-1);
  }, [onFileSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();

    const maxX = window.innerWidth - 160;
    const maxY = window.innerHeight - 100;
    const x = Math.min(e.clientX, maxX);
    const y = Math.min(e.clientY, maxY);

    setContextMenu({
      visible: true,
      x,
      y,
      path,
    });
    setFocusedIndex(-1);
  }, []);

  const handleCopyPath = useCallback(async () => {
    if (!contextMenu?.path) return;
    await window.api.filetree.copyPath(contextMenu.path, false);
    setContextMenu(null);
  }, [contextMenu]);

  const handleCopyRelativePath = useCallback(async () => {
    if (!contextMenu?.path) return;
    await window.api.filetree.copyPath(contextMenu.path, true);
    setContextMenu(null);
  }, [contextMenu]);

  const handleRevealInFileManager = useCallback(async () => {
    if (!contextMenu?.path) return;
    await window.api.filetree.revealInFileManager(contextMenu.path);
    setContextMenu(null);
  }, [contextMenu]);

  const handleOpenInTerminal = useCallback(async () => {
    if (!contextMenu?.path) return;
    await window.api.filetree.openInTerminal(contextMenu.path);
    setContextMenu(null);
  }, [contextMenu]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu?.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu?.visible]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!contextMenu && flatTree.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, flatTree.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < flatTree.length) {
          const { node } = flatTree[focusedIndex];
          if (node.type === 'file') {
            handleFileSelect(node.path);
          } else {
            handleToggleExpand(node);
          }
        } else if (e.key === 'ArrowRight' && focusedIndex >= 0 && focusedIndex < flatTree.length) {
          const { node } = flatTree[focusedIndex];
          if (node.type === 'directory' && !node.expanded) {
            handleToggleExpand(node);
          }
        } else if (e.key === 'ArrowLeft' && focusedIndex >= 0 && focusedIndex < flatTree.length) {
          const { node } = flatTree[focusedIndex];
          if (node.type === 'directory' && node.expanded) {
            handleToggleExpand(node);
          }
        }
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        setFocusedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatTree, focusedIndex, contextMenu, handleFileSelect, handleToggleExpand]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && fileTreeRef.current) {
      const item = fileTreeRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  const isGitRepo = activeProject?.isGitRepo && gitStatusLoaded;

  if (isCollapsed) {
    return (
      <aside
        className="w-12 flex flex-col items-center"
        style={{
          backgroundColor: 'var(--bg)',
          borderRight: `1px solid var(--border)`,
        }}
      >
        <div className="flex-1" />
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded flex items-center justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            color: 'var(--text-muted)',
          }}
          title="Expand panel"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="w-full md:w-[240px] lg:w-[280px] flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (activeProject?.path) {
                setGitStatusLoaded(false);
                window.api.filetree.getGitStatus(activeProject.path).then(result => {
                  setGitStatus(result.status);
                  setGitStatusLoaded(true);
                });
              }
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--text-muted)',
            }}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity ${showHidden ? 'opacity-100' : 'opacity-50'}`}
            style={{
              color: 'var(--text-muted)',
            }}
            title="Show hidden files"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--text-muted)',
            }}
            title="Collapse panel"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* Active Files Section */}
      {activeFiles.length > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          <div
            className="flex items-center gap-2 mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <Activity size={14} />
            <span className="text-xs font-semibold">Active Files</span>
          </div>
          <div className="space-y-1">
            {activeFiles.slice(0, 5).map((file, idx) => (
              <button
                key={idx}
                onClick={() => handleFileSelect(file.path)}
                className="w-full flex items-center gap-2 text-xs py-1 px-2 rounded hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                <File size={12} />
                <span className="truncate flex-1">{getRelativePath(file.path)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {isGitRepo && (
        <div
          className="flex items-center px-2 py-2 gap-1"
          style={{ borderBottom: `1px solid var(--border)` }}
        >
          {(['all', 'changed', 'staged', 'unstaged'] as FiletreeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-xs rounded-full transition-colors"
              style={{
                backgroundColor: filter === f ? 'var(--accent-indigo)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* File Tree */}
      <div
        ref={fileTreeRef}
        className="flex-1 overflow-y-auto px-2 py-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div
              className="animate-spin w-4 h-4 rounded-full"
              style={{ backgroundColor: 'var(--text-muted)' }}
            />
          </div>
        )}

        {flatTree.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <div
              className="text-xs text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              {isGitRepo && filter !== 'all' ? 'No matching files' : 'No files'}
            </div>
          </div>
        )}

        {flatTree.map(({ node, depth }, index) => {
          const isDir = node.type === 'directory';
          const status = getAggregatedStatus(node.path);
          const statusColor = getStatusColor(status);

          return (
            <div
              key={node.path}
              data-index={index}
              role="button"
              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:opacity-80 transition-opacity cursor-default"
              style={{
                color: statusColor,
                outline: focusedIndex === index ? '1px solid var(--accent-indigo)' : 'none',
                outlineOffset: '-1px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFocusedIndex(index);
                if (isDir) {
                  handleToggleExpand(node);
                } else {
                  handleFileSelect(node.path);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, node.path)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isDir) handleFileSelect(node.path);
              }}
            >
              <div style={{ width: `${depth * 12 + 8}px` }} />
              <button
                className="w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(node);
                }}
              >
                {node.loading ? (
                  <div
                    className="animate-spin w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                ) : node.error ? (
                  <AlertCircle size={12} />
                ) : isDir ? (
                  node.expanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )
                ) : (
                  <div style={{ width: '12px' }} />
                )}
              </button>
              {isDir ? (
                node.error ? (
                  <span
                    className="text-xs py-0.5 px-2 rounded"
                    style={{
                      backgroundColor: 'var(--status-conflict)',
                      color: '#fff',
                    }}
                  >
                    Permission denied
                  </span>
                ) : (
                  <>
                    {node.expanded ? (
                      <FolderOpen size={14} style={{ color: statusColor }} />
                    ) : (
                      <Folder size={14} style={{ color: statusColor }} />
                    )}
                    <span className="ml-1 text-xs truncate flex-1">{node.name}</span>
                  </>
                )
              ) : (
                <>
                  <File size={12} style={{ color: statusColor }} />
                  <span className="ml-1 text-xs truncate flex-1">{node.name}</span>
                </>
              )}
              <div className="flex-1" />
              {isDir && !node.error && getDiffBadge(status)}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] rounded-md shadow-lg py-1"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--card)',
            border: `1px solid var(--border)`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          role="menu"
        >
          <button
            onClick={handleCopyPath}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <Copy size={14} />
            Copy Path
          </button>
          <button
            onClick={handleCopyRelativePath}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <Copy size={14} />
            Copy Relative Path
          </button>
          <div
            className="my-1"
            style={{ borderBottom: `1px solid var(--border)` }}
          />
          <button
            onClick={handleRevealInFileManager}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <Search size={14} />
            Reveal in File Manager
          </button>
          <button
            onClick={handleOpenInTerminal}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <Terminal size={14} />
            Open in Terminal
          </button>
          <div
            className="my-1"
            style={{ borderBottom: `1px solid var(--border)` }}
          />
          <button
            onClick={() => setContextMenu(null)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            <X size={14} />
            Close
          </button>
        </div>
      )}
    </aside>
  );
}
