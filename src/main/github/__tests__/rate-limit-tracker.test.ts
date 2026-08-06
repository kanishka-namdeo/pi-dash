import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitTracker } from '../rate-limit-tracker';

describe('RateLimitTracker', () => {
  let tracker: RateLimitTracker;

  beforeEach(() => {
    tracker = new RateLimitTracker();
  });

  describe('initial state', () => {
    it('starts with 5000 remaining requests', () => {
      expect(tracker.getRemaining()).toBe(5000);
    });

    it('can make request initially', () => {
      expect(tracker.canMakeRequest()).toBe(true);
    });

    it('returns 0 wait time initially', () => {
      expect(tracker.getWaitTime()).toBe(0);
    });
  });

  describe('updateFromHeaders', () => {
    it('updates remaining from x-ratelimit-remaining header', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '100' });
      expect(tracker.getRemaining()).toBe(100);
    });

    it('updates reset time from x-ratelimit-reset header', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      tracker.updateFromHeaders({ 'x-ratelimit-reset': String(futureTimestamp) });
      // After update, remaining is still default since we didn't pass it
      expect(tracker.getRemaining()).toBe(5000);
    });

    it('handles both headers together', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      tracker.updateFromHeaders({
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(futureTimestamp),
      });
      expect(tracker.getRemaining()).toBe(50);
    });

    it('defaults to 5000 when header is missing', () => {
      tracker.updateFromHeaders({});
      expect(tracker.getRemaining()).toBe(5000);
    });

    it('handles string values correctly', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '250' });
      expect(tracker.getRemaining()).toBe(250);
    });
  });

  describe('canMakeRequest', () => {
    it('returns true when remaining > 10', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '11' });
      expect(tracker.canMakeRequest()).toBe(true);
    });

    it('returns false when remaining <= 10', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '10' });
      expect(tracker.canMakeRequest()).toBe(false);
    });

    it('returns false when remaining is 0', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '0' });
      expect(tracker.canMakeRequest()).toBe(false);
    });
  });

  describe('getWaitTime', () => {
    it('returns 0 when can make request', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '100' });
      expect(tracker.getWaitTime()).toBe(0);
    });

    it('returns positive wait time when rate limited', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      tracker.updateFromHeaders({
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': String(futureTimestamp),
      });
      const waitTime = tracker.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(3600 * 1000);
    });

    it('returns 0 when reset time is in the past', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
      tracker.updateFromHeaders({
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': String(pastTimestamp),
      });
      expect(tracker.getWaitTime()).toBe(0);
    });
  });

  describe('getRemaining', () => {
    it('returns current remaining count', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '42' });
      expect(tracker.getRemaining()).toBe(42);
    });

    it('reflects updates across multiple calls', () => {
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '100' });
      expect(tracker.getRemaining()).toBe(100);
      tracker.updateFromHeaders({ 'x-ratelimit-remaining': '50' });
      expect(tracker.getRemaining()).toBe(50);
    });
  });
});
