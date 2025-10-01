import { pipeline, env } from '@huggingface/transformers';
import { TranscriptSegment } from './transcriptionStorage';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium';
export type TranscriptionMode = 'browser' | 'bridge' | 'auto';

export interface TranscribeOptions {
  model?: WhisperModel;
  language?: string;
  mode?: TranscriptionMode;
  onProgress?: (progress: number) => void;
}

export interface BridgeStatus {
  ok: boolean;
  device: 'cpu' | 'metal' | 'cuda';
  models: BridgeModelInfo[];
}

export interface BridgeModelInfo {
  name: string;
  sizeMB: number;
  quant?: string;
  lang?: string[];
}

export interface WhisperResult {
  text: string;
  segments: TranscriptSegment[];
  srt: string;
}

let whisperPipeline: any = null;
let currentModel: WhisperModel | null = null;
let bridgeStatus: BridgeStatus | null = null;
let lastBridgeCheck = 0;
const BRIDGE_CHECK_INTERVAL = 5000; // 5 seconds

export async function initWhisper(model: WhisperModel = 'tiny', onProgress?: (progress: number) => void): Promise<void> {
  if (whisperPipeline && currentModel === model) {
    return; // Already initialized with the same model
  }

  // Use multilingual model (no .en suffix) to support French, English, and auto-detection
  const modelName = `onnx-community/whisper-${model}`;
  
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
    // Fallback to WASM if WebGPU fails
    console.warn('WebGPU failed, falling back to WASM:', error);
    whisperPipeline = await pipeline(
      'automatic-speech-recognition',
      modelName,
      {
        device: 'wasm',
        dtype: 'fp32',
      }
    );
    currentModel = model;
  }
}

// Bridge detection and management
export async function pingBridge(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:27123/status', { 
      mode: 'cors',
      timeout: 2000 
    } as RequestInit);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getBridgeStatus(): Promise<BridgeStatus | null> {
  const now = Date.now();
  if (bridgeStatus && (now - lastBridgeCheck) < BRIDGE_CHECK_INTERVAL) {
    return bridgeStatus;
  }

  try {
    const response = await fetch('http://localhost:27123/status', { 
      mode: 'cors',
      timeout: 2000 
    } as RequestInit);
    
    if (response.ok) {
      bridgeStatus = await response.json();
      lastBridgeCheck = now;
      return bridgeStatus;
    }
  } catch (error) {
    console.debug('Bridge not available:', error);
  }

  bridgeStatus = null;
  lastBridgeCheck = now;
  return null;
}

export async function transcribeBridge(
  audioBlob: Blob, 
  model: WhisperModel = 'small', 
  language: string = 'en'
): Promise<WhisperResult> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', model);
  formData.append('language', language);

  const response = await fetch('http://localhost:27123/transcribe', {
    method: 'POST',
    mode: 'cors',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Bridge transcription failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Convert bridge result to our format
  const segments: TranscriptSegment[] = result.segments?.map((seg: any) => ({
    t0: seg.start || seg.t0 || 0,
    t1: seg.end || seg.t1 || 0,
    text: seg.text.trim(),
    conf: seg.confidence || seg.conf
  })) || [];

  return {
    text: result.text || '',
    segments,
    srt: result.srt || generateSRT(segments)
  };
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscribeOptions = {}
): Promise<WhisperResult> {
  const { model = 'tiny', language = 'en', mode = 'auto', onProgress } = options;

  // Determine transcription method
  let useBridge = false;
  if (mode === 'bridge') {
    useBridge = true;
  } else if (mode === 'auto') {
    const bridgeAvailable = await pingBridge();
    // Use bridge for larger models or if specifically available
    useBridge = bridgeAvailable && (model === 'small' || model === 'medium');
  }

  // Try bridge first if desired
  if (useBridge) {
    try {
      onProgress?.(10);
      const result = await transcribeBridge(audioBlob, model, language);
      onProgress?.(100);
      return result;
    } catch (error) {
      console.warn('Bridge transcription failed, falling back to browser:', error);
      // Fall back to browser mode
    }
  }

  // Browser mode (existing logic)
  if (model === 'medium') {
    throw new Error('Medium model requires bridge mode - install the local bridge for better performance');
  }

  if (!whisperPipeline || currentModel !== model) {
    await initWhisper(model, onProgress);
  }

  const audioUrl = URL.createObjectURL(audioBlob);
  
  try {
    // Build options - omit language if undefined for auto-detection
    const pipelineOptions: any = {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    };
    
    // Only include language if specified (allows auto-detection)
    if (language) {
      pipelineOptions.language = language;
    }
    
    const result = await whisperPipeline(audioUrl, pipelineOptions);

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

export function getModelInfo(model: WhisperModel): { sizeMB: number; description: string; requiresBridge?: boolean } {
  switch (model) {
    case 'tiny':
      return { sizeMB: 39, description: 'Très rapide, précision basique' };
    case 'base':
      return { sizeMB: 74, description: 'Équilibré vitesse/qualité' };
    case 'small':
      return { sizeMB: 244, description: 'Meilleure qualité, bridge recommandé' };
    case 'medium':
      return { sizeMB: 769, description: 'Haute qualité, nécessite bridge', requiresBridge: true };
    default:
      return { sizeMB: 39, description: 'Modèle par défaut' };
  }
}

export function getAvailableModels(bridgeAvailable: boolean): WhisperModel[] {
  const browserModels: WhisperModel[] = ['tiny', 'base', 'small'];
  const bridgeModels: WhisperModel[] = ['tiny', 'base', 'small', 'medium'];
  
  return bridgeAvailable ? bridgeModels : browserModels;
}