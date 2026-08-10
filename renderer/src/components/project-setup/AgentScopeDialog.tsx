import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import type { AgentConfig } from '../../../../src/shared/types';

interface AgentScopeDialogProps {
  open: boolean;
  agents: AgentConfig[];
  onAddToGlobal: (agents: AgentConfig[]) => void;
  onAddToProject: (agents: AgentConfig[]) => void;
  onCancel: () => void;
}

export function AgentScopeDialog({ open, agents, onAddToGlobal, onAddToProject, onCancel }: AgentScopeDialogProps) {
  const [choice, setChoice] = useState<'global' | 'project'>('global');

  const handleContinue = () => {
    if (choice === 'global') onAddToGlobal(agents);
    else onAddToProject(agents);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Agents to Config</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These agents are not in your global config. How would you like to add them?
          </p>

          <ul className="space-y-1">
            {agents.map(a => (
              <li key={a.id} className="text-sm">{a.name} ({a.path})</li>
            ))}
          </ul>

          <div className="space-y-2">
            <label className="flex items-start gap-2">
              <input type="radio" name="scope" checked={choice === 'global'} onChange={() => setChoice('global')} />
              <div>
                <div className="text-sm font-medium">Add to global config</div>
                <div className="text-xs text-muted-foreground">Available across all projects</div>
              </div>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="scope" checked={choice === 'project'} onChange={() => setChoice('project')} />
              <div>
                <div className="text-sm font-medium">Use for this project only</div>
                <div className="text-xs text-muted-foreground">Specific to this project</div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleContinue}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
