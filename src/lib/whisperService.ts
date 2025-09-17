import { pipeline, env } from '@huggingface/transformers';
import { TranscriptSegment } from './transcriptionStorage';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export type WhisperModel = 'tiny' | 'base' | 'small';

export interface TranscribeOptions {
  model?: WhisperModel;
  language?: string;
  onProgress?: (progress: number) => void;
}

export interface WhisperResult {
  text: string;
  segments: TranscriptSegment[];
  srt: string;
}

let whisperPipeline: any = null;
let currentModel: WhisperModel | null = null;

export async function initWhisper(model: WhisperModel = 'tiny', onProgress?: (progress: number) => void): Promise<void> {
  if (whisperPipeline && currentModel === model) {
    return; // Already initialized with the same model
  }

  const modelName = `onnx-community/whisper-${model}.en`;
  
  try {
    whisperPipeline = await pipeline(
      'automatic-speech-recognition',
      modelName,
      {
        device: 'webgpu',
        dtype: 'fp16',
      }
    );
    currentModel = model;
  } catch (error) {
    // Fallback to CPU if WebGPU fails
    console.warn('WebGPU failed, falling back to CPU:', error);
    whisperPipeline = await pipeline(
      'automatic-speech-recognition',
      modelName,
      {
        device: 'cpu',
      }
    );
    currentModel = model;
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscribeOptions = {}
): Promise<WhisperResult> {
  const { model = 'tiny', language = 'en', onProgress } = options;

  if (!whisperPipeline || currentModel !== model) {
    await initWhisper(model, onProgress);
  }

  const audioUrl = URL.createObjectURL(audioBlob);
  
  try {
    const result = await whisperPipeline(audioUrl, {
      language,
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    URL.revokeObjectURL(audioUrl);

    // Convert result to our format
    const segments: TranscriptSegment[] = result.chunks?.map((chunk: any) => ({
      t0: chunk.timestamp[0] || 0,
      t1: chunk.timestamp[1] || 0,
      text: chunk.text.trim(),
      conf: chunk.confidence || undefined,
    })) || [];

    // Generate SRT format
    const srt = generateSRT(segments);

    return {
      text: result.text || '',
      segments,
      srt,
    };
  } catch (error) {
    URL.revokeObjectURL(audioUrl);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateSRT(segments: TranscriptSegment[]): string {
  return segments.map((segment, index) => {
    const startTime = formatSRTTime(segment.t0);
    const endTime = formatSRTTime(segment.t1);
    
    return `${index + 1}
${startTime} --> ${endTime}
${segment.text}

`;
  }).join('');
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function getModelInfo(model: WhisperModel): { sizeMB: number; description: string } {
  switch (model) {
    case 'tiny':
      return { sizeMB: 39, description: 'Très rapide, précision basique' };
    case 'base':
      return { sizeMB: 74, description: 'Équilibré vitesse/qualité' };
    case 'small':
      return { sizeMB: 244, description: 'Plus lent, meilleure qualité' };
    default:
      return { sizeMB: 39, description: 'Modèle par défaut' };
  }
}