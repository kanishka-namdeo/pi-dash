type RateLimitHeaders = Record<string, string | undefined>;

export class RateLimitTracker {
  private remaining: number = 5000;
  private limit: number = 5000;
  private resetAt: number = 0;

  updateFromHeaders(headers: RateLimitHeaders): void {
    this.remaining = parseInt(headers['x-ratelimit-remaining'] || '5000');
    this.limit = parseInt(headers['x-ratelimit-limit'] || '5000');
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

  getState(): {
    remaining: number;
    limit: number;
    resetAt: number;
    isLow: boolean;
    isExhausted: boolean;
  } {
    return {
      remaining: this.remaining,
      limit: this.limit,
      resetAt: this.resetAt,
      isLow: this.remaining < 500,
      isExhausted: this.remaining === 0
    };
  }
}

export const rateLimitTracker = new RateLimitTracker();
