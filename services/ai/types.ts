// services/ai/types.ts
// Shared types for the multi-AI orchestrator system

export interface CodeGenRequest {
  prompt: string;
  context?: string;
  model?: string;
  systemPrompt?: string;
}

export interface CodeGenResponse {
  code: string;
  explanation?: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  requiresApiKey: boolean;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  isAvailable(apiKey?: string): boolean;
  generateCode(
    request: CodeGenRequest,
    apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse>;
}

export interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
  quotaRemaining: {
    requestsPerDay: number;
    requestsPerMinute: number;
  };
}

export interface OrchestratorConfig {
  geminiApiKey?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  preferredModel?: string;
}

export interface StreamResponseResult {
  newRequirements: Array<{
    id: string;
    text: string;
    source: 'original' | 'added' | 'changed' | 'manual';
    status: 'planned' | 'done' | 'changed';
    versionFirstSeen: number | null;
  }>;
  fullText: string;
  provider: string;
  model: string;
}
