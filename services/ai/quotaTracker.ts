// services/ai/quotaTracker.ts
// Tracks API quota usage per provider with in-memory rate limiting

export interface QuotaStatus {
  requestsRemaining: number;
  minuteRequestsRemaining: number;
  resetAt: string | null;
}

interface ProviderQuota {
  requestsToday: number;
  requestsThisMinute: number;
  minuteStartTime: number;
  dayStartTime: number;
  exhausted: boolean;
}

export class QuotaTracker {
  private quotas: Map<string, ProviderQuota> = new Map();

  private getOrCreate(providerId: string): ProviderQuota {
    if (!this.quotas.has(providerId)) {
      this.quotas.set(providerId, {
        requestsToday: 0,
        requestsThisMinute: 0,
        minuteStartTime: Date.now(),
        dayStartTime: Date.now(),
        exhausted: false,
      });
    }
    return this.quotas.get(providerId)!;
  }

  private resetIfNeeded(quota: ProviderQuota): void {
    const now = Date.now();
    // Reset minute counter
    if (now - quota.minuteStartTime > 60_000) {
      quota.requestsThisMinute = 0;
      quota.minuteStartTime = now;
    }
    // Reset daily counter (24h)
    if (now - quota.dayStartTime > 86_400_000) {
      quota.requestsToday = 0;
      quota.dayStartTime = now;
      quota.exhausted = false;
    }
  }

  recordRequest(providerId: string): void {
    const quota = this.getOrCreate(providerId);
    this.resetIfNeeded(quota);
    quota.requestsToday += 1;
    quota.requestsThisMinute += 1;
  }

  markExhausted(providerId: string): void {
    const quota = this.getOrCreate(providerId);
    quota.exhausted = true;
  }

  getStatus(providerId: string, rateLimits: { requestsPerMinute: number; requestsPerDay: number }): QuotaStatus {
    const quota = this.getOrCreate(providerId);
    this.resetIfNeeded(quota);

    if (quota.exhausted) {
      return {
        requestsRemaining: 0,
        minuteRequestsRemaining: 0,
        resetAt: new Date(quota.dayStartTime + 86_400_000).toISOString(),
      };
    }

    return {
      requestsRemaining: Math.max(0, rateLimits.requestsPerDay - quota.requestsToday),
      minuteRequestsRemaining: Math.max(0, rateLimits.requestsPerMinute - quota.requestsThisMinute),
      resetAt: null,
    };
  }

  reset(providerId: string): void {
    this.quotas.delete(providerId);
  }
}
