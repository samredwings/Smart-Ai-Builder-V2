// services/ai/aiService.ts
// Top-level AI service initializer + singleton accessor
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIOrchestrator, OrchestratorConfig } from './orchestrator';

const KEYS_STORAGE_KEY = '@ai_builder_api_keys';

let orchestratorSingleton: AIOrchestrator | null = null;

export interface StoredApiKeys {
  gemini?: string;
  groq?: string;
  openrouter?: string;
  huggingface?: string;
  ollamaUrl?: string;
}

export async function initializeAIService(): Promise<AIOrchestrator> {
  let stored: StoredApiKeys = {};
  try {
    const raw = await AsyncStorage.getItem(KEYS_STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // Use empty keys — providers that require keys will be skipped
  }

  const config: OrchestratorConfig = {
    apiKeys: {
      gemini: stored.gemini || '',
      groq: stored.groq || '',
      openrouter: stored.openrouter || '',
      huggingface: stored.huggingface || '',
      ollama: '',
    },
    ollamaUrl: stored.ollamaUrl,
  };

  orchestratorSingleton = new AIOrchestrator(config);
  return orchestratorSingleton;
}

export function getAIOrchestrator(): AIOrchestrator | null {
  return orchestratorSingleton;
}

export async function saveApiKeys(keys: StoredApiKeys): Promise<void> {
  await AsyncStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  await initializeAIService();
}

export async function loadApiKeys(): Promise<StoredApiKeys> {
  try {
    const raw = await AsyncStorage.getItem(KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getAvailableProviders(): string[] {
  return orchestratorSingleton?.getAvailableProviders() ?? [];
}

// Non-streaming one-shot response (used by useAIRequirements)
export async function getAiResponse(
  prompt: string,
  context?: string
): Promise<{ text: string; provider: string; model: string }> {
  if (!orchestratorSingleton) {
    await initializeAIService();
  }
  if (!orchestratorSingleton) {
    throw new Error('AI service not initialized');
  }
  return orchestratorSingleton.chat(prompt, context);
}

export async function streamAiResponse(
  prompt: string,
  onChunk: (chunk: string, providerId: string) => void,
  context?: string
): Promise<{ fullText: string; provider: string; model: string }> {
  if (!orchestratorSingleton) {
    await initializeAIService();
  }
  if (!orchestratorSingleton) {
    throw new Error('AI service not initialized');
  }
  return orchestratorSingleton.chatStream(prompt, onChunk, context);
}

export function getQuotaStatus(): Record<string, any> {
  return orchestratorSingleton?.getAllQuotaStatus() ?? {};
}

export function resetAllQuotas(): void {
  orchestratorSingleton?.resetAllQuotas();
}
