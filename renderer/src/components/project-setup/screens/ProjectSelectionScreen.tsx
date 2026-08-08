import { useState } from 'react';
import type { ScreenName } from '../../../types/project-setup';

interface ScreenProps {
  flowMode: 'full' | 'condensed';
  navigate: (screen: ScreenName) => void;
  updateProject: (path: string) => void;
}

export function ProjectSelectionScreen({ flowMode, navigate, updateProject }: ScreenProps) {
  const [githubUrl, setGithubUrl] = useState('');

  const handleBrowse = async () => {
    const path = await window.api.openDirectory();
    if (path) {
      updateProject(path);
      navigate('project-loading');
    }
  };

  const handleGitHubSubmit = () => {
    if (githubUrl) {
      navigate('github-repo-picker');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Add Existing Project</h1>
          <p className="text-secondary-foreground">
            {flowMode === 'full' 
              ? 'Select a local project folder to get started'
              : 'Select a project folder'}
          </p>
        </div>

        <button
          onClick={handleBrowse}
          className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Browse...
        </button>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">or create from</p>
          <input
            type="text"
            placeholder="owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full h-12 px-4 bg-card border border-border rounded-lg"
          />
          <button
            onClick={handleGitHubSubmit}
            className="w-full h-12 bg-secondary text-secondary-foreground rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
