// services/ai/providers/ollama.ts
// Ollama provider for local/self-hosted inference
// Use this for: completely offline, private, no-filter inference
// Requires a running Ollama server (local network or device)
// On Android, you can run Ollama via Termux or connect to a PC on the same WiFi

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';

// Default to local network — change this to your Ollama server IP
// Example: 'http://192.168.1.100:11434' for a PC on the same WiFi
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

const DEFAULT_SYSTEM_PROMPT = `You are an expert React Native and Expo developer.
Generate clean, production-ready TypeScript code.
Use functional components, hooks, and StyleSheet.create().
Import from @/components, @/constants, @/hooks.
Respond with code inside markdown code blocks.`;

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama (Local)';
  models = [
    'llama3.2:1b',
    'llama3.2',
    'qwen2.5:0.5b',
    'qwen2.5:1.5b',
    'phi3:mini',
    'codellama:7b',
  ];
  requiresApiKey = false;
  rateLimits = {
    requestsPerMinute: 1000, // Local = effectively unlimited
    requestsPerDay: 100000,
  };

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_OLLAMA_URL;
  }

  isAvailable(): boolean {
    // Ollama doesn't need an API key — it's local
    // Availability is checked at request time via health check
    return true;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listLocalModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error('Failed to list Ollama models');
    const data = await res.json();
    return data.models?.map((m: any) => m.name) || [];
  }

  async generateCode(
    request: CodeGenRequest,
    _apiKey: string, // Not used for Ollama
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    const model = request.model || 'llama3.2:1b';

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${request.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\n${request.context ? `Context:\n${request.context}\n\n` : ''}Task: ${request.prompt}`,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 4096,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => 'Unknown');
      throw new Error(`Ollama error: ${response.status} - ${err}`);
    }

    if (!response.body) {
      throw new Error('Ollama returned empty body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const text = parsed.response || '';
            if (text) {
              fullText += text;
              onChunk?.(fullText);
            }
            if (parsed.done) break;
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      code: this.extractCode(fullText),
      explanation: this.extractExplanation(fullText),
      provider: this.id,
      model,
    };
  }

  private extractCode(text: string): string {
    const codeBlockRegex = /```(?:typescript|tsx|jsx|javascript)?\n([\s\S]*?)```/g;
    const matches: string[] = [];
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
    return matches.join('\n\n// --- File Separator ---\n\n') || text;
  }

  private extractExplanation(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  }
