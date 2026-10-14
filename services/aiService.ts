// services/ai/aiService.ts
// Main AI service — replaces the old stub with real multi-provider LLM calls
// This is what your chat screens import to talk to AI

import { AIOrchestrator, initOrchestrator, getOrchestrator } from './orchestrator';
import { CodeGenRequest } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEYS_STORAGE_KEY = '@ai_api_keys';

export interface ApiKeys {
  gemini?: string;
  groq?: string;
  openrouter?: string;
  huggingface?: string;
  ollamaUrl?: string;
}

// Load API keys from AsyncStorage
export async function loadApiKeys(): Promise<ApiKeys> {
  try {
    const stored = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save API keys to AsyncStorage
export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

// Initialize the orchestrator (call once at app startup)
export async function initializeAIService(): Promise<void> {
  const keys = await loadApiKeys();
  initOrchestrator({
    apiKeys: {
      gemini: keys.gemini || '',
      groq: keys.groq || '',
      openrouter: keys.openrouter || '',
      huggingface: keys.huggingface || '',
    },
    ollamaUrl: keys.ollamaUrl,
  });
}

// Check if AI service is ready (at least one provider available)
export async function isAIServiceReady(): Promise<boolean> {
  try {
    const orch = getOrchestrator();
    return orch.getAvailableProviders().length > 0;
  } catch {
    return false;
  }
}

// Get list of available providers
export function getAvailableProviders(): string[] {
  return getOrchestrator().getAvailableProviders();
}

// Get quota status for all providers
export function getQuotaStatus() {
  return getOrchestrator().getAllQuotaStatus();
}

// Streaming AI response (this is what your chat UI calls)
export async function streamAiResponse(
  prompt: string,
  onChunk: (text: string, providerId: string) => void,
  context?: string
): Promise<{ fullText: string; provider: string; model: string }> {
  const orch = getOrchestrator();

  const result = await orch.chatStream(prompt, (chunk, providerId) => {
    onChunk(chunk, providerId);
  }, context);

  return {
    fullText: result.text,
    provider: result.provider,
    model: result.model,
  };
}

// Non-streaming AI response
export async function getAiResponse(
  prompt: string,
  context?: string
): Promise<{ text: string; provider: string; model: string }> {
  const orch = getOrchestrator();
  return orch.chat(prompt, context);
}

// Code generation (for the build/export flow)
export async function generateCode(
  request: CodeGenRequest,
  onChunk?: (code: string, providerId: string) => void
): Promise<{ code: string; explanation: string; provider: string; model: string }> {
  const orch = getOrchestrator();

  const result = await orch.generateCode(request, onChunk);

  return {
    code: result.code,
    explanation: result.explanation,
    provider: result.usedProvider,
    model: result.model,
  };
}

// Reset all quotas (e.g. user presses a button at midnight)
export function resetAllQuotas() {
  getOrchestrator().resetAllQuotas();
}
