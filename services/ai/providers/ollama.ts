// services/ai/providers/ollama.ts
// Ollama local LLM provider — runs models on-device or LAN server
// No API key required, completely free and private

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';

const DEFAULT_BASE_URL = 'http://localhost:11434';

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama (Local)';
  models = ['llama3.2', 'codellama', 'mistral', 'phi3'];
  requiresApiKey = false;
  rateLimits = {
    requestsPerMinute: 999,
    requestsPerDay: 999999,
  };

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  isAvailable(_apiKey?: string): boolean {
    return true; // No API key needed
  }

  async generateCode(
    request: CodeGenRequest,
    _apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    const model = request.model || 'llama3.2';
    const url = `${this.baseUrl}/api/generate`;

    const prompt = request.context
      ? `Context:\n${request.context}\n\nTask: ${request.prompt}`
      : request.prompt;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}. Is Ollama running at ${this.baseUrl}?`);
    }

    let fullText = '';

    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder('utf-8');
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullText += parsed.response;
                onChunk?.(fullText);
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      fullText = await response.text();
      onChunk?.(fullText);
    }

    return {
      code: this.extractCode(fullText),
      explanation: this.extractExplanation(fullText),
      provider: this.id,
      model,
    };
  }

  private extractCode(text: string): string {
    const re = /```(?:typescript|tsx|jsx|javascript)?\n([\s\S]*?)```/g;
    const matches: string[] = [];
    let m;
    while ((m = re.exec(text)) !== null) matches.push(m[1].trim());
    return matches.join('\n\n// --- File Separator ---\n\n') || text;
  }

  private extractExplanation(text: string): string {
    return text.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }
}
