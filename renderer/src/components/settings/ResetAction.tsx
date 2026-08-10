import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ResetActionProps {
  title: string;
  description: string;
  impact: string;
  onConfirm: () => Promise<void>;
  requireText?: string;
}

export function ResetAction({ title, description, impact, onConfirm, requireText }: ResetActionProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const canConfirm = !requireText || confirmText === requireText;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setOpen(false);
      setConfirmText('');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmText('');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          {title}...
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm">This will remove:</p>
            <p className="text-sm font-medium">• {impact}</p>

            {requireText && (
              <div className="space-y-2">
                <p className="text-sm">Type "{requireText}" to confirm:</p>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={requireText}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm} 
              disabled={!canConfirm || isConfirming}
            >
              {isConfirming ? 'Resetting...' : title}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
