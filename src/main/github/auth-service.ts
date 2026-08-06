import Store from 'electron-store';
import { GitHubService, githubService } from './github-service';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubStoreSchema {
  github: {
    authMethod: 'oauth' | 'pat' | null;
    accessToken: string;
    user: GitHubUser | null;
  };
}

const store = new Store<GitHubStoreSchema>({
  projectName: 'pi-dash',
  encryptionKey: 'pi-dash-github-encryption-key',
  defaults: {
    github: {
      authMethod: null,
      accessToken: '',
      user: null
    }
  }
});

export class AuthService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
    const storedToken = store.get('github.accessToken');
    if (storedToken) {
      this.githubService.setToken(storedToken);
    }
  }

  async authenticatePAT(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.githubService.setToken(token);
      const { data: user } = await this.githubService.getOctokit().rest.users.getAuthenticated();
      
      store.set('github.authMethod', 'pat');
      store.set('github.accessToken', token);
      store.set('github.user', {
        id: user.id,
        login: user.login,
        avatarUrl: user.avatar_url
      });

      return { success: true };
    } catch (error) {
      this.githubService.clearToken();
      return { success: false, error: 'Invalid token. Please check your GitHub PAT.' };
    }
  }

  getToken(): string | null {
    return store.get('github.accessToken') || null;
  }

  clearToken(): void {
    store.set('github.authMethod', null);
    store.set('github.accessToken', '');
    store.set('github.user', null);
    this.githubService.clearToken();
  }

  getUser(): GitHubUser | null {
    return store.get('github.user');
  }
}

export const authService = new AuthService(githubService);
