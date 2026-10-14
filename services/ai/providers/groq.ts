// services/ai/providers/groq.ts
// Groq API provider with streaming support

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_SYSTEM_PROMPT = `You are an expert React Native and Expo developer.
Your task is to generate clean, production-ready TypeScript code for mobile apps.
Follow these rules:
1. Use Expo SDK and React Native best practices
2. Use functional components with hooks
3. Style with StyleSheet.create() or NativeWind
4. Import from correct paths: @/components, @/constants, @/hooks
5. Respond with code inside markdown code blocks
6. After code, provide a brief explanation of what was built
7. If generating multiple files, clearly label each file`;

export class GroqProvider implements AIProvider {
  id = 'groq';
  name = 'Groq';
  models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ];
  requiresApiKey = true;
  rateLimits = {
    requestsPerMinute: 30,
    requestsPerDay: 1000,
  };

  isAvailable(apiKey?: string): boolean {
    return !!apiKey && apiKey.startsWith('gsk_');
  }

  async generateCode(
    request: CodeGenRequest,
    apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    const model = request.model || 'llama-3.3-70b-versatile';

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: request.context
              ? `Context:\n${request.context}\n\nTask: ${request.prompt}`
              : request.prompt,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    if (!response.body) {
      throw new Error('Groq API returned empty response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content || '';
            if (chunk) {
              fullText += chunk;
              onChunk?.(fullText);
            }
          } catch {
            // Skip malformed SSE chunks
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
