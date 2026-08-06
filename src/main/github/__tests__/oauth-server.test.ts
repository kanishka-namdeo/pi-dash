import { describe, it, expect, afterEach, vi } from 'vitest';
import { OAuthServer } from '../oauth-server';

describe('OAuthServer', () => {
  let server: OAuthServer;

  afterEach(() => {
    server?.stop();
  });

  it('starts server on port 9876', async () => {
    server = new OAuthServer();
    const result = await server.start();
    expect(result.port).toBe(9876);
  });

  it('receives authorization code via callback', async () => {
    server = new OAuthServer();
    await server.start();

    // Simulate GitHub callback
    const response = await fetch('http://localhost:9876/callback?code=test_code_123&state=test_state');
    expect(response.status).toBe(200);

    const result = await server.waitForCode(5000);
    expect(result.code).toBe('test_code_123');
    expect(result.state).toBe('test_state');
  });

  it('captures state parameter from callback', async () => {
    server = new OAuthServer();
    await server.start();

    await fetch('http://localhost:9876/callback?code=abc&state=csrf_token_xyz');
    const result = await server.waitForCode(5000);
    expect(result.state).toBe('csrf_token_xyz');
  });

  it('handles missing state parameter', async () => {
    server = new OAuthServer();
    await server.start();

    await fetch('http://localhost:9876/callback?code=abc');
    const result = await server.waitForCode(5000);
    expect(result.state).toBeNull();
  });

  it('times out when no code received', async () => {
    server = new OAuthServer();
    await server.start();

    await expect(server.waitForCode(100)).rejects.toThrow('OAuth timeout');
  });

  it('stop() cleans up server resources', async () => {
    server = new OAuthServer();
    await server.start();
    server.stop();

    // Server should be closed - connection should fail
    await expect(fetch('http://localhost:9876/callback?code=x')).rejects.toThrow();
  });

  it('stop() is safe to call multiple times', async () => {
    server = new OAuthServer();
    await server.start();
    server.stop();
    server.stop(); // Should not throw
  });

  // Integration test: exercises real timer behavior (1-second auto-stop delay)
  // Real timers needed because we're verifying actual setTimeout cleanup in the server
  it('auto-stops after receiving callback', async () => {
    server = new OAuthServer();
    await server.start();

    await fetch('http://localhost:9876/callback?code=auto_stop_test');
    await server.waitForCode(5000);

    // Wait for auto-stop (1 second + buffer)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Server should be closed
    await expect(fetch('http://localhost:9876/callback?code=y')).rejects.toThrow();
  }, 5000);
});
