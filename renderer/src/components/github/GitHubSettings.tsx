import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useGitHubAuth } from '../../hooks/useGitHubAuth';
import { useRepos } from '../../hooks/useRepos';
import { GitBranch, LogOut, Plus, Trash2 } from 'lucide-react';

export function GitHubSettings() {
  const { isAuthenticated, user, login, logout } = useGitHubAuth();
  const { repos, addRepo, removeRepo } = useRepos();
  const [patInput, setPatInput] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);

  if (!isAuthenticated) {
    return (
      <Card className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">GitHub Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => login('oauth')} className="w-full rounded-md">
            <GitBranch className="mr-2 h-4 w-4" />
            Connect with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#2a2a2a]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1a1a] px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {!showPatInput ? (
            <Button variant="outline" onClick={() => setShowPatInput(true)} className="w-full rounded-md">
              Use Personal Access Token
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="ghp_..."
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
              />
              <Button
                onClick={() => { login('pat', patInput); setShowPatInput(false); setPatInput(''); }}
                className="w-full rounded-md"
                disabled={!patInput}
              >
                Save Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">GitHub Integration</CardTitle>
          <Button variant="ghost" size="sm" onClick={logout} className="rounded-md">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <img src={user?.avatarUrl} alt={user?.login} className="h-10 w-10 rounded-full" />
          <div>
            <div className="font-medium">{user?.login}</div>
            <div className="text-sm text-muted-foreground">Authenticated</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Repositories</div>
            <Button size="sm" className="rounded-md">
              <Plus className="mr-2 h-4 w-4" />
              Add Repo
            </Button>
          </div>

          {repos.length === 0 ? (
            <div className="text-sm text-muted-foreground">No repositories configured</div>
          ) : (
            <div className="space-y-2">
              {repos.map(repo => (
                <div key={repo.id} className="flex items-center justify-between rounded-md bg-[#0a0a0a] p-3">
                  <div>
                    <div className="font-medium text-sm">{repo.fullName}</div>
                    <div className="text-xs text-muted-foreground">{repo.localPath}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRepo(repo.id)} className="rounded-md">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
