import { useState } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

export function ProjectSelectionGitHubConnectedScreen({ navigate, updateProject }: ScreenProps) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/');

  const handleClone = () => {
    if (repoUrl) {
      navigate('clone-repository');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Add Existing Project</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-sm">
            <span>✓</span>
            <span>Connected as octocat</span>
          </div>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full h-12 px-4 bg-card border border-border rounded-lg"
          />
          <button onClick={handleClone} className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium">
            Clone
          </button>
          <button onClick={() => navigate('github-repo-picker')} className="w-full h-12 text-muted-foreground text-sm">
            Connect Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
