import type { PollingState } from '../../shared/github-types';
import { rateLimitTracker } from './rate-limit-tracker';

export class PollingManager {
  private pollFn: () => Promise<void>;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSync = 0;

  constructor(pollFn: () => Promise<void>, intervalMs = 30000) {
    this.pollFn = pollFn;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setInterval(ms: number): void {
    this.intervalMs = ms;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  getState(): PollingState {
    const rateState = rateLimitTracker.getState();
    return {
      isPolling: this.timer !== null,
      interval: this.intervalMs,
      lastSync: this.lastSync,
      remaining: rateState.remaining,
      limit: rateState.limit,
      resetAt: rateState.resetAt,
    };
  }

  private async poll(): Promise<void> {
    if (!rateLimitTracker.canMakeRequest()) return;
    try {
      await this.pollFn();
      this.lastSync = Date.now();
    } catch (err) {
      console.error('PollingManager: poll failed', err);
    }
  }
}
