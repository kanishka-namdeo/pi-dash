import express from 'express';
import { Server } from 'http';

export class OAuthServer {
  private server: Server | null = null;
  private code: string | null = null;

  async start(): Promise<{ port: number }> {
    return new Promise((resolve) => {
      const app = express();

      app.get('/callback', (req, res) => {
        this.code = req.query.code as string;
        res.send('Authorization successful! You can close this window.');
        setTimeout(() => this.stop(), 1000);
      });

      this.server = app.listen(9876, () => {
        resolve({ port: 9876 });
      });
    });
  }

  async waitForCode(): Promise<string> {
    while (!this.code) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.code;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
