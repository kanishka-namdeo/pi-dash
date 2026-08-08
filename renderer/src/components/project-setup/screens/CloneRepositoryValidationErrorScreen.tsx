import { useState } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
  validationErrors: Record<string, string>;
}

export function CloneRepositoryValidationErrorScreen({ navigate, updateProject, validationErrors }: ScreenProps) {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dest, setDest] = useState('');

  const handleSubmit = () => {
    if (url && dest) {
      updateProject(dest);
      navigate('cloning-progress');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <h1 className="text-3xl font-bold text-center">Clone Repository</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Repository URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full h-12 px-4 bg-card border border-destructive rounded-lg" />
            {validationErrors.repoUrl && <p className="text-sm text-destructive mt-1">{validationErrors.repoUrl}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Branch</label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-medium">Destination</label>
            <input value={dest} onChange={(e) => setDest(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={handleSubmit} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Clone</button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">Cancel</button>
        </div>
      </div>
    </div>
  );
}
