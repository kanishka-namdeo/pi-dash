import { useState } from 'react';
import type { ScreenName, ValidationErrors } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

function validateCloneForm(url: string, branch: string, dest: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!url) errors.repoUrl = 'Repository URL is required';
  else if (!/^https:\/\/github\.com\/[\w-]+\/[\w-]+/.test(url)) {
    errors.repoUrl = 'Please enter a valid repository URL';
  }
  if (branch && !/^[a-zA-Z0-9\-_/]+$/.test(branch)) errors.branch = 'Invalid branch name';
  if (!dest) errors.destination = 'Destination is required';
  return errors;
}

export function CloneRepositoryScreen({ navigate, updateProject }: ScreenProps) {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [dest, setDest] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = () => {
    const validationErrors = validateCloneForm(url, branch, dest);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      navigate('clone-repository-validation-error');
      return;
    }
    updateProject(dest);
    navigate('cloning-progress');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <h1 className="text-3xl font-bold text-center">Clone Repository</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Repository URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full h-12 px-4 bg-card border border-border rounded-lg" />
            {errors.repoUrl && <p className="text-sm text-destructive">{errors.repoUrl}</p>}
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
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">← Back</button>
        </div>
      </div>
    </div>
  );
}
