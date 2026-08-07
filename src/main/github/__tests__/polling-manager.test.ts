import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { PollingManager } from '../polling-manager';
import { rateLimitTracker } from '../rate-limit-tracker';

vi.mock('../rate-limit-tracker', () => ({
  rateLimitTracker: {
    canMakeRequest: vi.fn(() => true),
    getState: vi.fn(() => ({ remaining: 5000, limit: 5000, resetAt: 0, isLow: false, isExhausted: false })),
  },
}));

describe('PollingManager', () => {
  let pollFn: Mock;
  let manager: PollingManager;

  beforeEach(() => {
    vi.useFakeTimers();
    pollFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(rateLimitTracker.canMakeRequest).mockReturnValue(true);
  });

  afterEach(() => {
    manager?.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('calls pollFn immediately on start', () => {
      manager = new PollingManager(pollFn);
      manager.start();
      expect(pollFn).toHaveBeenCalledTimes(1);
    });

    it('calls pollFn on each interval', () => {
      manager = new PollingManager(pollFn, 1000);
      manager.start();
      expect(pollFn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(pollFn).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1000);
      expect(pollFn).toHaveBeenCalledTimes(3);
    });

    it('uses default interval of 30000ms', () => {
      manager = new PollingManager(pollFn);
      manager.start();
      vi.advanceTimersByTime(29999);
      expect(pollFn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(pollFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop', () => {
    it('stops polling', () => {
      manager = new PollingManager(pollFn, 1000);
      manager.start();
      expect(pollFn).toHaveBeenCalledTimes(1);
      manager.stop();
      vi.advanceTimersByTime(5000);
      expect(pollFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('setInterval', () => {
    it('updates interval and restarts if running', () => {
      manager = new PollingManager(pollFn, 1000);
      manager.start();
      expect(pollFn).toHaveBeenCalledTimes(1);
      manager.setInterval(2000);
      // setInterval restarts, so pollFn called again immediately
      expect(pollFn).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1999);
      expect(pollFn).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1);
      expect(pollFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('getState', () => {
    it('returns polling state with rate limit info', () => {
      manager = new PollingManager(pollFn, 5000);
      const state = manager.getState();
      expect(state.isPolling).toBe(false);
      expect(state.interval).toBe(5000);
      expect(state.remaining).toBe(5000);
      expect(state.limit).toBe(5000);
    });

    it('reflects isPolling after start', () => {
      manager = new PollingManager(pollFn);
      manager.start();
      expect(manager.getState().isPolling).toBe(true);
    });

    it('updates lastSync after successful poll', async () => {
      manager = new PollingManager(pollFn);
      expect(manager.getState().lastSync).toBe(0);
      manager.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(manager.getState().lastSync).toBeGreaterThan(0);
    });
  });

  describe('rate limit awareness', () => {
    it('skips poll when rate limit is too low', async () => {
      vi.mocked(rateLimitTracker.canMakeRequest).mockReturnValue(false);
      manager = new PollingManager(pollFn, 1000);
      manager.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(pollFn).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('continues polling after error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      pollFn.mockRejectedValueOnce(new Error('network error')).mockResolvedValue(undefined);
      manager = new PollingManager(pollFn, 1000);
      manager.start();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      expect(pollFn).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });
});
