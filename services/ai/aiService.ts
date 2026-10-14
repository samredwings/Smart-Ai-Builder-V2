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
  // Re-initialize with new keys
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
