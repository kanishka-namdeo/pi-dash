import { useNavigate } from 'react-router-dom';
import {
  Pause,
  Play,
  GitBranch,
  Trash2,
  Link,
  Bell,
  Settings,
  HelpCircle,
  Plus,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Project } from '@/types/project-setup';

function ProjectSwitcher({
  activeProject,
  onProjectChange,
  onAddProject,
}: {
  activeProject: Project | null;
  onProjectChange: (project: Project) => void;
  onAddProject: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    window.api.getProjects().then(setProjects);
  }, []);

  const handleSelect = (value: string) => {
    if (value === '__add__') {
      onAddProject();
      return;
    }
    const project = projects.find(p => p.path === value);
    if (project) onProjectChange(project);
  };

  return (
    <Select value={activeProject?.path || ''} onValueChange={handleSelect}>
      <SelectTrigger
        className="border-0 bg-transparent shadow-none hover:opacity-80 p-0 h-auto gap-1"
        style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 500 }}
      >
        <SelectValue placeholder="pi-dash" />
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </SelectTrigger>
      <SelectContent>
        {projects.map(p => (
          <SelectItem key={p.path} value={p.path}>
            {p.name}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="__add__">
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Project
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

type TopBarProps = {
  isFeedPaused: boolean;
  hasMainAgent: boolean;
  activeProject: Project | null;
  repoFullName?: string;
  onToggleFeedPause: () => void;
  onClearFeed: () => void;
  onProjectChange: (project: Project) => void;
  onAddProject: () => void;
  onProjectUpdated?: () => void;
};
export function TopBar({
  isFeedPaused,
  activeProject,
  repoFullName,
  onToggleFeedPause,
  onClearFeed,
  onProjectChange,
  onAddProject,
  onProjectUpdated,
}: TopBarProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    window.api.getProjects().then(setProjects);
  }, []);

  const handleCopyAgents = async (sourcePath: string) => {
    try {
      const allProjects = await window.api.getProjects();
      const source = allProjects.find(p => p.path === sourcePath);
      if (!source || !activeProject) return;

      const copiedProjectAgents = (source.projectAgents || []).map(a => ({
        ...a,
        id: crypto.randomUUID(),
      }));

      await window.api.updateProject(activeProject.path, {
        selectedAgents: source.selectedAgents || [],
        projectAgents: copiedProjectAgents,
      });

      onProjectUpdated?.();
      toast.success(`Agents copied from ${source.name}`);
    } catch {
      toast.error('Failed to copy agents. Try again.');
    }
  };

  return (
    <header
      className="flex items-center justify-between px-6 h-14 overflow-x-hidden"
      style={{
        backgroundColor: 'var(--bg)',
        borderBottom: `1px solid var(--border)`,
      }}
    >
      {/* Left: Status + Title */}
      <div className="flex items-center gap-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--accent-emerald)' }}
        />
        <span
          className="text-base font-semibold whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          Pi Orchestrator
        </span>
        <div className="flex items-center gap-2">
          <ProjectSwitcher
            activeProject={activeProject}
            onProjectChange={onProjectChange}
            onAddProject={onAddProject}
          />
          {repoFullName && (
            <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              · {repoFullName}
            </span>
          )}
        </div>
      </div>


      {/* Center: Worktrees */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <GitBranch size={14} />
        Worktrees
      </button>


      {/* Right: Nav + Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/settings/github')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Link size={16} />
        </button>
        <button
          onClick={() => toast('Notifications coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => toast('Help docs coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <HelpCircle size={16} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
              title="Copy agents from another project"
            >
              <Copy size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {projects
              .filter(p => p.path !== activeProject?.path)
              .map(p => (
                <DropdownMenuItem key={p.path} onClick={() => handleCopyAgents(p.path)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            {projects.filter(p => p.path !== activeProject?.path).length === 0 && (
              <DropdownMenuItem disabled>No other projects</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 mx-2" style={{ backgroundColor: 'var(--border)' }} />

        <button
          onClick={onToggleFeedPause}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          {isFeedPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          onClick={onClearFeed}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </header>
  );
}
