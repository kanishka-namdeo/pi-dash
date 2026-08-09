import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Spinner } from '../ui/Spinner';
import { useAgentScanner } from '../../hooks/useAgentScanner';
import type { AgentConfig } from '../../../src/shared/types';

interface QuickScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickScanModal({ open, onOpenChange }: QuickScanModalProps) {
  const [existingAgents, setExistingAgents] = useState<AgentConfig[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { scan, isScanning, result, error } = useAgentScanner({
    mode: 'incremental',
    existingAgents,
  });

  useEffect(() => {
    if (open) {
      setAgentsLoaded(false);
      window.api.getAgents().then((agents) => {
        setExistingAgents(agents);
        setAgentsLoaded(true);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && agentsLoaded) {
      scan();
    }
  }, [open, agentsLoaded, scan]);

  const handleAddSelected = async () => {
    const newAgents = result?.newAgents?.filter(a => selectedIds.has(a.id)) || [];
    const allAgents = [...existingAgents, ...newAgents];
    await window.api.saveAgents(allAgents);
    onOpenChange(false);
  };

  const toggleAgent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan for Agents</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-destructive">Scan failed: {error.message}</p>
            <Button variant="outline" size="sm" onClick={() => scan()}>Retry</Button>
          </div>
        ) : isScanning ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size={40} />
            <p>Scanning for agents...</p>
          </div>
        ) : !result?.newAgents?.length ? (
          <div className="py-8 text-center">
            <p>No new agents detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p>{result.newAgents.length} new agent(s) detected</p>
            <div className="space-y-2">
              {result.newAgents.map(agent => (
                <label key={agent.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                  />
                  {agent.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddSelected} disabled={!selectedIds.size}>Add Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
