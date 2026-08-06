import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  worktreePath: string;
}

export function PRComposer({ open, onClose, worktreePath }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function handleCreate() {
    const result = await window.api.agentGitHub.createPR(worktreePath, title, body);
    console.log('PR created:', result);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fix authentication issue"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={8}
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-md">Cancel</Button>
            <Button onClick={handleCreate} disabled={!title} className="flex-1 rounded-md">
              Create PR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
