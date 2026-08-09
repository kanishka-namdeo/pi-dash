import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import type { DriftReport } from '../../../src/shared/types';

interface DriftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drift: DriftReport;
}

export function DriftModal({ open, onOpenChange, drift }: DriftModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agent Configuration Drift</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {drift.missingAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">⚠ {drift.missingAgents.length} agent(s) missing</h3>
              {drift.missingAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2">
                  <span>{agent.name} ({agent.path})</span>
                  <Button size="sm" variant="outline" onClick={() => window.api.saveAgents([])}>Remove</Button>
                </div>
              ))}
            </div>
          )}

          {drift.movedAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">🔄 {drift.movedAgents.length} agent(s) moved</h3>
              {drift.movedAgents.map(v => (
                <div key={v.agent.id} className="flex items-center justify-between py-2">
                  <span>{v.agent.name} → {v.newPath}</span>
                  <Button size="sm" variant="outline">Update Path</Button>
                </div>
              ))}
            </div>
          )}

          {drift.newAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">✨ {drift.newAgents.length} new agent(s) detected</h3>
              {drift.newAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2">
                  <span>{agent.name} ({agent.path})</span>
                  <Button size="sm" variant="outline">Add</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
