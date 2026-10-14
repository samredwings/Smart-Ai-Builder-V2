// services/ai/providers/llamaNative.ts
// llama.rn provider for true on-device offline inference
// Uses llama.cpp via native bindings — requires expo prebuild / EAS build

import { AIProvider, CodeGenRequest, CodeGenResponse } from '../types';
import { LlamaContext, initLlama } from 'llama.rn';
import { getModelManager, OFFLINE_MODELS } from '../modelManager';

const DEFAULT_SYSTEM_PROMPT = `You are an expert React Native and Expo developer.
Generate clean TypeScript code. Use functional components and hooks.
Respond with code inside markdown blocks. Be concise.`;

export class LlamaNativeProvider implements AIProvider {
  id = 'llama-native';
  name = 'On-Device LLM (llama.rn)';
  models = OFFLINE_MODELS.map((m) => m.id);
  requiresApiKey = false;
  rateLimits = {
    requestsPerMinute: 1000, // Local = unlimited
    requestsPerDay: 100000,
  };

  private context: LlamaContext | null = null;
  private currentModelId: string | null = null;

  isAvailable(): boolean {
    // Actual availability checked at load time
    return true;
  }

  async isModelReady(modelId: string): Promise<boolean> {
    const manager = getModelManager();
    return manager.isModelDownloaded(modelId);
  }

  async loadModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    const manager = getModelManager();

    // Download if needed
    if (!(await manager.isModelDownloaded(modelId))) {
      await manager.downloadModel(modelId, (p) => {
        onProgress?.(p.progress);
      });
    }

    const modelPath = manager.getModelPath(modelId);

    // If already loaded with same model, skip
    if (this.context && this.currentModelId === modelId) {
      return;
    }

    // Unload previous
    if (this.context) {
      await this.context.release();
      this.context = null;
    }

    // Load new model
    this.context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 1, // Offload 1 layer to GPU if available
    });

    this.currentModelId = modelId;
  }

  async unloadModel(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentModelId = null;
    }
  }

  async generateCode(
    request: CodeGenRequest,
    _apiKey: string, // Not used
    onChunk?: (chunk: string) => void
  ): Promise<CodeGenResponse> {
    if (!this.context) {
      throw new Error(
        'No model loaded. Call loadModel() before generating code.'
      );
    }

    const systemPrompt = request.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const fullPrompt = `<|system|>\n${systemPrompt}\n<|user|>\n${request.context ? `Context:\n${request.context}\n\n` : ''}${request.prompt}\n<|assistant|>\n`;

    const result = await this.context.completion(
      {
        prompt: fullPrompt,
        n_predict: 2048,
        temperature: 0.7,
        stop: ['<|user|>', '<|system|>', '<|end|>'],
      },
      (data) => {
        // data.token contains each token as it generates
        onChunk?.(data.token);
      }
    );

    const fullText = result.text || '';

    return {
      code: this.extractCode(fullText),
      explanation: this.extractExplanation(fullText),
      provider: this.id,
      model: this.currentModelId || 'unknown',
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
