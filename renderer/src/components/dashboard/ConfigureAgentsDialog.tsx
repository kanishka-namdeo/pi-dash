import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AgentRow } from '../ui/AgentRow';
import { mergeAgents } from '../../utils/agentScope';
import type { AgentConfig } from '../../../../src/shared/types';
import type { Project } from '../../types/project-setup';

interface ConfigureAgentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeProject: Project | null;
  availableAgents: AgentConfig[];
  onSaved: (selectedAgents: string[]) => void;
}

export function ConfigureAgentsDialog({
  open,
  onOpenChange,
  activeProject,
  availableAgents,
  onSaved,
}: ConfigureAgentsDialogProps) {
  const projectAgents = activeProject?.projectAgents || [];
  const allAgents = mergeAgents(availableAgents, projectAgents);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && activeProject) {
      setSelectedIds(activeProject.selectedAgents || []);
    }
  }, [open, activeProject]);

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    onSaved(selectedIds);
    onOpenChange(false);
  };

  const promoteToGlobal = async (agent: AgentConfig) => {
    try {
      const existing = await window.api.getAgents();
      await window.api.saveAgents([...existing, agent]);
      const remaining = projectAgents.filter(a => a.id !== agent.id);
      await window.api.updateProject(activeProject!.path, { projectAgents: remaining });
      toast.success(`${agent.name} added to global config`);
      onSaved(selectedIds);
    } catch {
      toast.error('Failed to promote agent. Try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Configure Agents for Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Global agents */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Global Agents</h3>
            <div className="space-y-2">
              {availableAgents.map(agent => (
                <AgentRow
                  key={agent.id}
                  name={agent.name}
                  path={agent.path}
                  icon={agent.icon}
                  gradient=""
                  selected={selectedIds.includes(agent.id)}
                  onToggle={() => toggle(agent.id)}
                  showCheckbox
                />
              ))}
              {availableAgents.length === 0 && (
                <p className="text-sm text-muted-foreground">No global agents configured.</p>
              )}
            </div>
          </div>

          {/* Project-scoped agents */}
          {projectAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Project-Specific Agents</h3>
              <div className="space-y-2">
                {projectAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <AgentRow
                        name={agent.name}
                        path={agent.path}
                        icon={agent.icon}
                        gradient=""
                        selected={selectedIds.includes(agent.id)}
                        onToggle={() => toggle(agent.id)}
                        showCheckbox
                        badge="Project"
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => promoteToGlobal(agent)}>
                      Promote to Global
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
