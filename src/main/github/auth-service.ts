import Store from 'electron-store';
import { BrowserWindow } from 'electron';
import { GitHubService, githubService } from './github-service';
import { OAuthServer } from './oauth-server';

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

  async authenticateOAuth(): Promise<{ success: boolean; error?: string }> {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || clientId === 'YOUR_GITHUB_OAUTH_CLIENT_ID' ||
        !clientSecret || clientSecret === 'YOUR_GITHUB_OAUTH_CLIENT_SECRET') {
      return { success: false, error: 'OAuth credentials not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET environment variables.' };
    }

    const oauthServer = new OAuthServer();
    await oauthServer.start();

    const state = crypto.randomUUID();
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: { nodeIntegration: false }
    });

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,write:discussion,read:discussion&state=${state}`;

    authWindow.loadURL(authUrl);

    try {
      const { code, state: returnedState } = await oauthServer.waitForCode();

      if (returnedState !== state) {
        authWindow.close();
        oauthServer.stop();
        return { success: false, error: 'OAuth state mismatch. Possible CSRF attack.' };
      }

      const token = await this.exchangeCodeForToken(code, clientId, clientSecret);

      this.githubService.setToken(token);
      const { data: user } = await this.githubService.getOctokit().rest.users.getAuthenticated();

      store.set('github.authMethod', 'oauth');
      store.set('github.accessToken', token);
      store.set('github.user', {
        id: user.id,
        login: user.login,
        avatarUrl: user.avatar_url
      });

      authWindow.close();
      oauthServer.stop();
      return { success: true };
    } catch (error) {
      authWindow.close();
      oauthServer.stop();
      return { success: false, error: 'OAuth authentication failed' };
    }
  }

  private async exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Token exchange failed: no access_token in response');
    }
    return data.access_token;
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
