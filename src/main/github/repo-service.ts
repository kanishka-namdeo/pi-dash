import Store from 'electron-store';
import { GitHubService, githubService } from './github-service';
import { Repo, RepoConfig } from '../../shared/github-types';

interface RepoStoreSchema {
  repoConfig: RepoConfig;
}

const store = new Store<RepoStoreSchema>({
  projectName: 'pi-dash',
  defaults: {
    repoConfig: { repos: [], activeRepoId: null }
  }
});

export class RepoService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async addRepo(owner: string, name: string, localPath: string): Promise<Repo> {
    const { data } = await this.githubService.getOctokit().rest.repos.get({ owner, repo: name });
    
    const repo: Repo = {
      id: data.id,
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      localPath,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      lastSyncedAt: Date.now()
    };

    const config = store.get('repoConfig');
    config.repos.push(repo);
    store.set('repoConfig', config);

    return repo;
  }

  removeRepo(id: number): void {
    const config = store.get('repoConfig');
    config.repos = config.repos.filter(r => r.id !== id);
    if (config.activeRepoId === id) {
      config.activeRepoId = null;
    }
    store.set('repoConfig', config);
  }

  listRepos(): Repo[] {
    return store.get('repoConfig').repos;
  }

  getActiveRepo(): Repo | null {
    const config = store.get('repoConfig');
    if (!config.activeRepoId) return null;
    return config.repos.find(r => r.id === config.activeRepoId) ?? null;
  }

  setActiveRepo(id: number): void {
    const config = store.get('repoConfig');
    config.activeRepoId = id;
    store.set('repoConfig', config);
  }
}

export const repoService = new RepoService(githubService);
