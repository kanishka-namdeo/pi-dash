import { useState, useEffect } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  issueNumber?: number;
  repoPath: string;
}

export function CreateWorktreeDialog({ open, onClose, issueNumber, repoPath }: Props) {
  const [branch, setBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [destination, setDestination] = useState('');
  const { settings } = useSettingsContext();

  useEffect(() => {
    if (!issueNumber || !settings?.worktrees.branchNamingPattern) return;
    const pattern = settings.worktrees.branchNamingPattern;
    const generated = pattern
      .replace('{number}', String(issueNumber))
      .replace('{name}', `issue-${issueNumber}`)
      .replace('{id}', crypto.randomUUID().slice(0, 8));
    setBranch(generated);
  }, [issueNumber, settings?.worktrees.branchNamingPattern]);

  useEffect(() => {
    if (open && settings?.worktrees.directory && !destination) {
      setDestination(`${settings.worktrees.directory}/${branch}`);
    }
  }, [open, settings?.worktrees.directory]);

  async function handleCreate() {
    // Note: worktree IPC methods need to be exposed in preload.ts similar to GitHub methods.
    // For now, this is a placeholder. In production, this should call:
    // await window.api.worktree.create({ repoPath, branch, baseBranch, destination, issueNumber });
    console.log('Creating worktree:', { repoPath, branch, baseBranch, destination, issueNumber });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle>Create Worktree{issueNumber && ` for Issue #${issueNumber}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Branch name</Label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="fix/123-feature"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Base branch</Label>
            <Input
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination path</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="/path/to/worktree"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-md">Cancel</Button>
            <Button onClick={handleCreate} disabled={!branch || !destination} className="flex-1 rounded-md">
              Create Worktree
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
