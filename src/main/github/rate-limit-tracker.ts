type RateLimitHeaders = Record<string, string | undefined>;

export class RateLimitTracker {
  private remaining: number = 5000;
  private resetAt: number = 0;

  updateFromHeaders(headers: RateLimitHeaders): void {
    this.remaining = parseInt(headers['x-ratelimit-remaining'] || '5000');
    this.resetAt = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;
  }

  canMakeRequest(): boolean {
    return this.remaining > 10;
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    return Math.max(0, this.resetAt - Date.now());
  }

  getRemaining(): number {
    return this.remaining;
  }
}

export const rateLimitTracker = new RateLimitTracker();
