// services/ai/modelManager.ts
// GGUF model download / cache / path management for llama.rn offline inference
import * as FileSystem from 'expo-file-system';

export interface OfflineModel {
  id: string;
  name: string;
  url: string;
  sizeMB: number;
  description: string;
}

export const OFFLINE_MODELS: OfflineModel[] = [
  {
    id: 'qwen2.5-0.5b-instruct',
    name: 'Qwen2.5 0.5B Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeMB: 470,
    description: 'Smallest & fastest. Good for quick code snippets.',
  },
  {
    id: 'llama-3.2-1b-instruct',
    name: 'Llama 3.2 1B Instruct',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeMB: 780,
    description: 'Balanced quality/speed for on-device chat.',
  },
  {
    id: 'smollm2-1.7b-instruct',
    name: 'SmolLM2 1.7B Instruct',
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf',
    sizeMB: 1100,
    description: 'Best offline quality of the three.',
  },
];

export interface DownloadProgress {
  progress: number; // 0..1
  downloadedBytes: number;
  totalBytes: number;
}

class ModelManager {
  private modelsDir = `${FileSystem.documentDirectory}models/`;
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();

  private async ensureDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(this.modelsDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.modelsDir, { intermediates: true });
    }
  }

  getModelPath(modelId: string): string {
    return `${this.modelsDir}${modelId}.gguf`;
  }

  findModel(modelId: string): OfflineModel | undefined {
    return OFFLINE_MODELS.find((m) => m.id === modelId);
  }

  async isModelDownloaded(modelId: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(this.getModelPath(modelId));
    return info.exists && !info.isDirectory && (info.size ?? 0) > 0;
  }

  async downloadModel(
    modelId: string,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string> {
    const model = this.findModel(modelId);
    if (!model) throw new Error(`Unknown model: ${modelId}`);

    await this.ensureDir();

    if (await this.isModelDownloaded(modelId)) {
      onProgress?.({ progress: 1, downloadedBytes: 0, totalBytes: 0 });
      return this.getModelPath(modelId);
    }

    const dest = this.getModelPath(modelId);
    const resumable = FileSystem.createDownloadResumable(
      model.url,
      dest,
      {},
      (downloadProgress) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        const done = downloadProgress.totalBytesWritten;
        onProgress?.({
          progress: total > 0 ? done / total : 0,
          downloadedBytes: done,
          totalBytes: total,
        });
      }
    );

    this.activeDownloads.set(modelId, resumable);
    try {
      const result = await resumable.downloadAsync();
      if (!result || !result.uri) throw new Error('Download failed');
      return result.uri;
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }

  async cancelDownload(modelId: string): Promise<void> {
    const resumable = this.activeDownloads.get(modelId);
    if (resumable) await resumable.pauseAsync();
    this.activeDownloads.delete(modelId);
  }

  async deleteModel(modelId: string): Promise<void> {
    await FileSystem.deleteAsync(this.getModelPath(modelId), { idempotent: true });
  }

  async listDownloadedModels(): Promise<string[]> {
    await this.ensureDir();
    const entries = await FileSystem.readDirectoryAsync(this.modelsDir);
    return entries
      .filter((e) => e.endsWith('.gguf'))
      .map((e) => e.replace(/\.gguf$/, ''));
  }

  async getDownloadedSize(modelId: string): Promise<number> {
    const info = await FileSystem.getInfoAsync(this.getModelPath(modelId), { size: true });
    return info.exists ? info.size ?? 0 : 0;
  }
}

let singleton: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!singleton) singleton = new ModelManager();
  return singleton;
      }
