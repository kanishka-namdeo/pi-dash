import express from 'express';
import { Server } from 'http';

export interface OAuthResult {
  code: string;
  state: string | null;
}

export class OAuthServer {
  private server: Server | null = null;
  private code: string | null = null;
  private receivedState: string | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private codeResolvers: Array<(value: OAuthResult) => void> = [];

  async start(): Promise<{ port: number }> {
    const { promise, resolve } = Promise.withResolvers<{ port: number }>();
    const app = express();

    app.get('/callback', (req, res) => {
      this.code = req.query.code as string;
      this.receivedState = (req.query.state as string) || null;
      res.send('Authorization successful! You can close this window.');
      this.autoStopTimer = setTimeout(() => this.stop(), 1000);
      
      // Resolve all waiting promises
      const result = { code: this.code, state: this.receivedState };
      this.codeResolvers.forEach(r => r(result));
      this.codeResolvers = [];
    });

    this.server = app.listen(9876, () => {
      resolve({ port: 9876 });
    });

    return promise;
  }

  async waitForCode(timeoutMs: number = 300000): Promise<OAuthResult> {
    // If code already received, return immediately
    if (this.code !== null) {
      return { code: this.code, state: this.receivedState };
    }

    const { promise, resolve } = Promise.withResolvers<OAuthResult>();
    this.codeResolvers.push(resolve);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        this.stop();
        reject(new Error('OAuth timeout: no authorization code received'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  stop(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
