import { useState } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
}

export function GitHubRepoPickerScreen({ navigate }: ScreenProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');

  const handleConnect = () => {
    if (!repoUrl || !/^[\w-]+\/[\w-]+$/.test(repoUrl)) {
      setError('Please enter a valid repository (e.g. octocat/hello-world)');
      return;
    }
    navigate('clone-repository');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Connect GitHub Repository</h1>
          <p className="text-muted-foreground">Sign in to access private repositories and clone directly from GitHub.</p>
        </div>
        <button className="w-full h-12 bg-card border border-border rounded-lg font-medium flex items-center justify-center gap-2">
          <span>🔗</span> Connect to GitHub
        </button>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or enter a public repo URL below</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setError(''); }}
            placeholder="owner/repo"
            className="w-full h-12 px-4 bg-card border border-border rounded-lg"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="space-y-3">
          <button onClick={handleConnect} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">Connect</button>
          <button onClick={() => navigate('project-selection')} className="w-full h-12 text-muted-foreground">Cancel</button>
        </div>
      </div>
    </div>
  );
}
