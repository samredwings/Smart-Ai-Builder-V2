// services/ai/quotaTracker.ts
// Tracks API usage per provider with daily and per-minute windows

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuotaState {
  requestsToday: number;
  requestsThisMinute: number;
  lastResetDate: string;
  lastMinuteReset: number;
}

const DEFAULT_LIMITS: Record<string, { rpm: number; rpd: number }> = {
  gemini: { rpm: 15, rpd: 1500 },
  groq: { rpm: 30, rpd: 1000 },
  openrouter: { rpm: 20, rpd: 50 },
};

export class QuotaTracker {
  private limits: Record<string, { rpm: number; rpd: number }>;

  constructor(customLimits?: Record<string, { rpm: number; rpd: number }>) {
    this.limits = { ...DEFAULT_LIMITS, ...customLimits };
  }

  private storageKey(providerId: string): string {
    return `@ai_quota_${providerId}`;
  }

  private async getState(providerId: string): Promise<QuotaState> {
    const raw = await AsyncStorage.getItem(this.storageKey(providerId));
    const now = new Date();
    const defaultState: QuotaState = {
      requestsToday: 0,
      requestsThisMinute: 0,
      lastResetDate: now.toDateString(),
      lastMinuteReset: now.getTime(),
    };

    if (!raw) return defaultState;

    const state: QuotaState = JSON.parse(raw);

    // Reset daily counter
    if (state.lastResetDate !== now.toDateString()) {
      state.requestsToday = 0;
      state.lastResetDate = now.toDateString();
    }

    // Reset per-minute counter (rolling 60-second window)
    if (now.getTime() - state.lastMinuteReset > 60000) {
      state.requestsThisMinute = 0;
      state.lastMinuteReset = now.getTime();
    }

    return state;
  }

  async canMakeRequest(providerId: string): Promise<boolean> {
    const limits = this.limits[providerId];
    if (!limits) return false;

    const state = await this.getState(providerId);
    return (
      state.requestsToday < limits.rpd &&
      state.requestsThisMinute < limits.rpm
    );
  }

  async recordRequest(providerId: string): Promise<void> {
    const state = await this.getState(providerId);
    state.requestsToday += 1;
    state.requestsThisMinute += 1;
    await AsyncStorage.setItem(
      this.storageKey(providerId),
      JSON.stringify(state)
    );
  }

  async getRemaining(providerId: string): Promise<{
    requestsPerDay: number;
    requestsPerMinute: number;
  }> {
    const limits = this.limits[providerId];
    if (!limits) return { requestsPerDay: 0, requestsPerMinute: 0 };

    const state = await this.getState(providerId);
    return {
      requestsPerDay: Math.max(0, limits.rpd - state.requestsToday),
      requestsPerMinute: Math.max(0, limits.rpm - state.requestsThisMinute),
    };
  }

  async resetProvider(providerId: string): Promise<void> {
    await AsyncStorage.removeItem(this.storageKey(providerId));
  }

  async resetAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.storageKey('gemini'),
      this.storageKey('groq'),
      this.storageKey('openrouter'),
    ]);
  }
      }
