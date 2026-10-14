// services/ai/orchestrator.ts
// Multi-AI orchestrator with fallback, quota tracking, and provider selection

import { AIProvider, CodeGenRequest, CodeGenResponse, QuotaStatus } from './types';
import { QuotaTracker } from './quotaTracker';
import { GeminiProvider } from './providers/gemini';
import { GroqProvider } from './providers/groq';
import { OpenRouterProvider } from './providers/openrouter';
import { OllamaProvider } from './providers/ollama';
import { HuggingFaceProvider } from './providers/huggingface';

// Provider priority order (highest = first)
const DEFAULT_PRIORITY = ['gemini', 'groq', 'openrouter', 'huggingface', 'ollama'];

export interface OrchestratorConfig {
  apiKeys: Record<string, string>; // provider id -> api key
  priority?: string[];             // provider order
  ollamaUrl?: string;              // e.g. http://192.168.1.100:11434
}

export class AIOrchestrator {
  private providers: Map<string, AIProvider> = new Map();
  private quotaTracker: QuotaTracker;
  private priority: string[];
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.priority = config.priority || DEFAULT_PRIORITY;
    this.quotaTracker = new QuotaTracker();

    // Register all providers
    this.register('gemini', new GeminiProvider());
    this.register('groq', new GroqProvider());
    this.register('openrouter', new OpenRouterProvider());
    this.register('huggingface', new HuggingFaceProvider());

    // Ollama is special — needs base URL
    if (config.ollamaUrl) {
      this.register('ollama', new OllamaProvider(config.ollamaUrl));
    } else {
      this.register('ollama', new OllamaProvider());
    }
  }

  private register(id: string, provider: AIProvider) {
    this.providers.set(id, provider);
  }

  // Get list of available providers (have API keys and quota left)
  getAvailableProviders(): string[] {
    const available: string[] = [];

    for (const id of this.priority) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      // Check API key
      const apiKey = this.config.apiKeys[id];
      if (provider.requiresApiKey && !provider.isAvailable(apiKey)) {
        continue;
      }

      // Check quota
      const quota = this.quotaTracker.getStatus(id, provider.rateLimits);
      if (quota.requestsRemaining <= 0) {
        continue;
      }

      available.push(id);
    }

    return available;
  }

  // Get quota status for all providers
  getAllQuotaStatus(): Record<string, QuotaStatus> {
    const result: Record<string, QuotaStatus> = {};
    for (const [id, provider] of this.providers) {
      result[id] = this.quotaTracker.getStatus(id, provider.rateLimits);
    }
    return result;
  }

  // Generate code with automatic fallback
  async generateCode(
    request: CodeGenRequest,
    onChunk?: (chunk: string, providerId: string) => void
  ): Promise<CodeGenResponse & { usedProvider: string }> {
    const available = this.getAvailableProviders();

    if (available.length === 0) {
      throw new Error(
        'No AI providers available. Please check your API keys or wait for quota reset.'
      );
    }

    const errors: string[] = [];

    for (const providerId of available) {
      const provider = this.providers.get(providerId)!;
      const apiKey = this.config.apiKeys[providerId] || '';

      try {
        // Record request attempt
        this.quotaTracker.recordRequest(providerId);

        const response = await provider.generateCode(
          request,
          apiKey,
          (chunk) => onChunk?.(chunk, providerId)
        );

        return {
          ...response,
          usedProvider: providerId,
        };
      } catch (err: any) {
        const msg = err?.message || String(err);

        // Rate limit hit — mark quota as exhausted
        if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
          this.quotaTracker.markExhausted(providerId);
        }

        errors.push(`${providerId}: ${msg}`);
        console.warn(`[AIOrchestrator] ${providerId} failed: ${msg}`);
        // Continue to next provider
      }
    }

    throw new Error(
      `All providers failed:\n${errors.join('\n')}`
    );
  }

  // Quick chat (non-streaming)
  async chat(
    prompt: string,
    context?: string
  ): Promise<{ text: string; provider: string; model: string }> {
    const request: CodeGenRequest = {
      prompt,
      context,
      model: undefined,
      systemPrompt: undefined,
    };

    const response = await this.generateCode(request);

    return {
      text: response.explanation || response.code,
      provider: response.usedProvider,
      model: response.model,
    };
  }

  // Streaming chat
  async chatStream(
    prompt: string,
    onChunk: (chunk: string, providerId: string) => void,
    context?: string
  ): Promise<{ text: string; provider: string; model: string }> {
    const request: CodeGenRequest = {
      prompt,
      context,
      model: undefined,
      systemPrompt: undefined,
    };

    const response = await this.generateCode(request, onChunk);

    return {
      text: response.explanation || response.code,
      provider: response.usedProvider,
      model: response.model,
    };
  }

  // Reset quota for a provider (e.g. after midnight)
  resetQuota(providerId: string) {
    this.quotaTracker.reset(providerId);
  }

  // Reset all quotas
  resetAllQuotas() {
    for (const id of this.providers.keys()) {
      this.quotaTracker.reset(id);
    }
  }
}

// Singleton instance (initialized with keys from storage)
let orchestratorInstance: AIOrchestrator | null = null;

export function initOrchestrator(config: OrchestratorConfig): AIOrchestrator {
  orchestratorInstance = new AIOrchestrator(config);
  return orchestratorInstance;
}

export function getOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    throw new Error('Orchestrator not initialized. Call initOrchestrator first.');
  }
  return orchestratorInstance;
          }
