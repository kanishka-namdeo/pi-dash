import { describe, it, expect } from 'vitest';
import { getMockResponse } from './mockResponses';

describe('getMockResponse', () => {
  it('returns help response for claude', () => {
    const result = getMockResponse('claude', 'help');
    expect(result).toBeDefined();
    expect(result.response).toContain('Available commands');
    expect(result.delay).toEqual({ min: 300, max: 800 });
  });

  it('returns ls response for cursor', () => {
    const result = getMockResponse('cursor', 'ls');
    expect(result).toBeDefined();
    expect(result.response).toContain('src/');
    expect(result.delay.min).toBeLessThan(result.delay.max);
  });

  it('returns fallback for unknown command', () => {
    const result = getMockResponse('claude', 'unknown-command');
    expect(result).toBeDefined();
    expect(result.response).toContain('not recognized');
  });
});
