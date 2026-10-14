// services/ai/providers/huggingface.ts
// Hugging Face Serverless Inference API
// Free tier: $0.10/month in credits (~thousands of tokens)
// Best for: quick testing with open models, no credit card for basic usage
// Good open models: microsoft/Phi-3-mini-4k-instruct, meta-llama/Llama-3.2-1B-Instruct

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';

const HF_API_URL = 'https://api-inference.huggingface.co/models';

const DEFAULT_SYSTEM_PROMPT = `You are an expert React Native and Expo developer.
Generate clean TypeScript code. Use functional components and hooks.
Respond with code inside markdown blocks.`;

export class HuggingFaceProvider implements AIProvider {
  id = 'huggingface';
  name = 'Hugging Face';
  models = [
    'microsoft/Phi-3-mini-4k-instruct',
    'meta-llama/Llama-3.2-1B-Instruct',
    'HuggingFaceH4/zephyr-7b-beta',
  ];
  requiresApiKey = true;
  rateLimits = {
    requestsPerMinute: 60,
    requestsPerDay: 1000, // Approximate, varies by model load
  };

  isAvailable(apiKey?: string): boolean {
    return !!apiKey && apiKey.startsWith('hf_');
  }

  async generateCode(
    request: CodeGenRequest,
    apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    const model = request.model || 'microsoft/Phi-3-mini-4k-instruct';

    // HF inference API doesn't stream in the same way — we'll simulate chunks
    const response = await fetch(`${HF_API_URL}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<|system|>\n${request.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n<|user|>\n${request.context ? `Context:\n${request.context}\n\n` : ''}${request.prompt}\n<|assistant|>\n`,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    });

    if (response.status === 503) {
      throw new Error(
        'Hugging Face model is loading. Wait 20-30 seconds and retry.'
      );
    }

    if (!response.ok) {
      const err = await response.text().catch(() => 'Unknown');
      throw new Error(`Hugging Face error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const fullText = Array.isArray(data) ? data[0].generated_text : data.generated_text;

    // Simulate streaming for UI consistency
    const words = fullText.split(' ');
    let accumulated = '';
    for (const word of words) {
      accumulated += word + ' ';
      onChunk?.(accumulated);
      // Small delay to simulate streaming feel
      await new Promise(r => setTimeout(r, 5));
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
