// Stub implementation - AddAgentDialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgentDialog({ open, onOpenChange }: AddAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agent</DialogTitle>
        </DialogHeader>
        <div>Add Agent Dialog (not implemented)</div>
      </DialogContent>
    </Dialog>
  );
}
