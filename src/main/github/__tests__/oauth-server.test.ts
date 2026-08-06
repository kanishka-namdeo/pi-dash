import { describe, it, expect } from 'vitest';
import { OAuthServer } from '../oauth-server';

describe('OAuthServer', () => {
  it('starts server on port 9876', async () => {
    const server = new OAuthServer();
    const result = await server.start();
    expect(result.port).toBe(9876);
    server.stop();
  });
});
