// services/ai/providers/gemini.ts
// Google Gemini API provider with streaming support

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// System prompt for React Native / Expo code generation
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

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini';
  models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
  ];
  requiresApiKey = true;
  rateLimits = {
    requestsPerMinute: 15,
    requestsPerDay: 1500,
  };

  isAvailable(apiKey?: string): boolean {
    return !!apiKey && apiKey.length > 10;
  }

  async generateCode(
    request: CodeGenRequest,
    apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    const model = request.model || 'gemini-2.5-flash';
    const url = `${GEMINI_API_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const systemPrompt = request.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: request.context
                ? `Context:\n${request.context}\n\nTask: ${request.prompt}`
                : request.prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Gemini API returned empty response body');
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
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    // Remove code blocks and return remaining text
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
          }
