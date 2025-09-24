import type { WhisperModel } from '@/lib/whisperService';
import { getTranscriptionDB } from '@/lib/transcriptionStorage';

export interface DownloadProgress {
  model: WhisperModel;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  bytesLoaded: number;
  bytesTotal: number;
  error?: string;
}

export interface ModelDownloadManager {
  download: (model: WhisperModel, onProgress?: (progress: DownloadProgress) => void) => Promise<void>;
  cancel: (model: WhisperModel) => void;
  getProgress: (model: WhisperModel) => DownloadProgress | null;
  isDownloading: (model: WhisperModel) => boolean;
}

class ModelDownloadService implements ModelDownloadManager {
  private activeDownloads = new Map<WhisperModel, AbortController>();
  private progressCallbacks = new Map<WhisperModel, (progress: DownloadProgress) => void>();
  private currentProgress = new Map<WhisperModel, DownloadProgress>();

  async download(model: WhisperModel, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    // Cancel existing download for this model
    if (this.activeDownloads.has(model)) {
      this.cancel(model);
    }

    const controller = new AbortController();
    this.activeDownloads.set(model, controller);

    if (onProgress) {
      this.progressCallbacks.set(model, onProgress);
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if already cached
        const cached = await this.checkIfCached(model);
        if (cached) {
          this.updateProgress(model, {
            model,
            progress: 100,
            status: 'completed',
            bytesLoaded: this.getModelSize(model),
            bytesTotal: this.getModelSize(model)
          });
          return;
        }

        // Start download with retry info
        this.updateProgress(model, {
          model,
          progress: 5,
          status: 'downloading',
          bytesLoaded: 0,
          bytesTotal: this.getModelSize(model),
          error: attempt > 1 ? `Tentative ${attempt}/${maxRetries}` : undefined
        });

        await this.downloadModel(model, controller.signal, attempt);
        
        this.updateProgress(model, {
          model,
          progress: 100,
          status: 'completed',
          bytesLoaded: this.getModelSize(model),
          bytesTotal: this.getModelSize(model)
        });
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Download failed');
        
        if (lastError.name === 'AbortError') {
          this.updateProgress(model, {
            model,
            progress: 0,
            status: 'cancelled',
            bytesLoaded: 0,
            bytesTotal: this.getModelSize(model)
          });
          return;
        }

        // If this is the last attempt, handle final error
        if (attempt === maxRetries) {
          const errorMessage = this.getDetailedErrorMessage(lastError);
          this.updateProgress(model, {
            model,
            progress: 0,
            status: 'error',
            bytesLoaded: 0,
            bytesTotal: this.getModelSize(model),
            error: errorMessage
          });
          throw new Error(errorMessage);
        }

        // Wait before retry with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but just in case
    const finalError = lastError || new Error('Download failed after retries');
    this.updateProgress(model, {
      model,
      progress: 0,
      status: 'error',
      bytesLoaded: 0,
      bytesTotal: this.getModelSize(model),
      error: this.getDetailedErrorMessage(finalError)
    });
    throw finalError;
  }

  cancel(model: WhisperModel): void {
    const controller = this.activeDownloads.get(model);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(model);
      this.updateProgress(model, {
        model,
        progress: 0,
        status: 'cancelled',
        bytesLoaded: 0,
        bytesTotal: this.getModelSize(model)
      });
    }
  }

  getProgress(model: WhisperModel): DownloadProgress | null {
    return this.currentProgress.get(model) || null;
  }

  isDownloading(model: WhisperModel): boolean {
    return this.activeDownloads.has(model);
  }

  private async downloadModel(model: WhisperModel, signal: AbortSignal, attempt: number = 1): Promise<void> {
    // For HuggingFace models, we trigger the download by initializing the pipeline
    // The actual caching is handled by transformers.js internally
    
    const { pipeline } = await import('@huggingface/transformers');
    const modelName = `onnx-community/whisper-${model}.en`;

    // Try WebGPU first, fallback to CPU
    const deviceConfigs = [
      { device: 'webgpu' as const, dtype: 'fp16' as const, description: 'WebGPU' },
      { device: 'cpu' as const, dtype: 'fp32' as const, description: 'CPU' }
    ];

    let lastError: Error | null = null;

    for (const config of deviceConfigs) {
      if (signal.aborted) return;

      try {
        this.updateProgress(model, {
          model,
          progress: 15,
          status: 'downloading',
          bytesLoaded: 0,
          bytesTotal: this.getModelSize(model),
          error: config.device === 'cpu' ? 'WebGPU non supporté, utilisation CPU...' : undefined
        });

        // Create pipeline - this will download and cache the model
        const pipe = await pipeline(
          'automatic-speech-recognition',
          modelName,
          {
            device: config.device,
            dtype: config.dtype,
            progress_callback: (progress: any) => {
              if (signal.aborted) return;
              
              // Progress from transformers.js
              const baseProgress = config.device === 'cpu' ? 20 : 15;
              const progressPercent = Math.min(90, baseProgress + (progress.progress || 0) * 70);
              this.updateProgress(model, {
                model,
                progress: progressPercent,
                status: 'downloading',
                bytesLoaded: Math.floor((progressPercent / 100) * this.getModelSize(model)),
                bytesTotal: this.getModelSize(model),
                error: config.device === 'cpu' ? `Mode CPU activé (${config.description})` : undefined
              });
            }
          }
        );

        // Store preference that model is ready
        await this.markModelAsReady(model);
        
        // Clean up pipeline reference
        pipe.dispose?.();
        return; // Success
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Failed with ${config.description}`);
        console.warn(`Model download failed with ${config.description}:`, error);
        
        // If this is not the last config, continue to next
        if (config !== deviceConfigs[deviceConfigs.length - 1]) {
          continue;
        }
      }
    }

    // If we get here, all device configs failed
    throw lastError || new Error('Failed to download model with any device configuration');
  }

  private async checkIfCached(model: WhisperModel): Promise<boolean> {
    try {
      // Check if we have a preference indicating the model is ready
      const db = await getTranscriptionDB();
      const pref = await db.get('prefs', `model_${model}_ready`);
      return pref?.value === true;
    } catch {
      return false;
    }
  }

  private async markModelAsReady(model: WhisperModel): Promise<void> {
    try {
      const db = await getTranscriptionDB();
      await db.put('prefs', {
        key: `model_${model}_ready`,
        value: true
      });
    } catch (error) {
      console.warn('Failed to mark model as ready:', error);
    }
  }

  private getModelSize(model: WhisperModel): number {
    // Sizes in bytes (approximate)
    const sizes = {
      tiny: 39 * 1024 * 1024,   // 39 MB
      base: 74 * 1024 * 1024,   // 74 MB  
      small: 244 * 1024 * 1024, // 244 MB
      medium: 769 * 1024 * 1024 // 769 MB
    };
    return sizes[model] || sizes.tiny;
  }

  private getDetailedErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('cors') || message.includes('network')) {
      return 'Erreur réseau : Vérifiez votre connexion internet et réessayez';
    }
    
    if (message.includes('webgpu') || message.includes('gpu')) {
      return 'WebGPU non supporté : Téléchargement en mode CPU (plus lent)';
    }
    
    if (message.includes('memory') || message.includes('quota')) {
      return 'Mémoire insuffisante : Essayez un modèle plus petit (tiny ou base)';
    }
    
    if (message.includes('fetch') || message.includes('timeout')) {
      return 'Connexion interrompue : Cliquez pour reprendre le téléchargement';
    }
    
    if (message.includes('abort')) {
      return 'Téléchargement annulé par l\'utilisateur';
    }
    
    return `Erreur de téléchargement : ${error.message}`;
  }

  private updateProgress(model: WhisperModel, progress: DownloadProgress): void {
    this.currentProgress.set(model, progress);
    const callback = this.progressCallbacks.get(model);
    if (callback) {
      callback(progress);
    }
  }
}

// Singleton instance
export const modelDownloadService = new ModelDownloadService();

/**
 * Utility function to format bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Utility function to format download speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Utility function to estimate time remaining
 */
export function formatTimeRemaining(bytesRemaining: number, bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return 'Calcul...';
  
  const secondsRemaining = bytesRemaining / bytesPerSecond;
  
  if (secondsRemaining < 60) {
    return `${Math.ceil(secondsRemaining)}s`;
  } else if (secondsRemaining < 3600) {
    return `${Math.ceil(secondsRemaining / 60)}min`;
  } else {
    return `${Math.ceil(secondsRemaining / 3600)}h`;
  }
}