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

  // Convert audio to WAV format if needed (Whisper requires WAV/PCM)
  let processedBlob = audioBlob;
  const audioType = audioBlob.type.toLowerCase();
  
  // Convert ANY non-WAV format to WAV (Safari/macOS uses mp4/m4a, Chrome uses webm, etc.)
  if (!audioType.includes('wav')) {
    console.log('🔄 Converting audio from', audioBlob.type, 'to WAV for Whisper...');
    try {
      processedBlob = await convertToWav(audioBlob);
      console.log('✅ Conversion successful:', {
        originalSize: audioBlob.size,
        convertedSize: processedBlob.size,
        originalType: audioBlob.type
      });
    } catch (conversionError) {
      console.error('❌ Audio conversion failed:', conversionError);
      throw new Error(`Échec de conversion audio: ${conversionError}`);
    }
  }

  const audioUrl = URL.createObjectURL(processedBlob);
  
  try {
    console.log('Transcribing audio:', {
      size: processedBlob.size,
      type: processedBlob.type,
      model,
      language
    });

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
    
    console.log('Transcription successful:', result.text?.substring(0, 100));

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
    console.error('Transcription error:', error);
    console.error('Audio blob details:', {
      size: processedBlob.size,
      type: processedBlob.type,
      sizeKB: Math.round(processedBlob.size / 1024)
    });
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('decode')) {
        throw new Error(`Erreur de décodage audio. Essayez un autre format.`);
      }
    }
    throw error;
  }
}

/**
 * Merge multiple compressed audio chunks into a single 16kHz mono WAV
 * This is CRITICAL: concatenating compressed audio (webm/mp4/ogg) creates invalid containers
 * Instead, decode each chunk independently, then merge the PCM data
 */
export async function mergeChunksToWav(chunks: Blob[]): Promise<Blob> {
  if (chunks.length === 0) {
    throw new Error('No chunks to merge');
  }
  
  if (chunks.length === 1) {
    // Single chunk: just convert it
    return convertToWavOfflineMono16k(chunks[0]);
  }
  
  console.log('🔗 Merging', chunks.length, 'chunks into single 16kHz mono WAV...');
  
  const targetSr = 16000;
  const decodedBuffers: AudioBuffer[] = [];
  let totalDuration = 0;
  let skippedCount = 0;
  
  // Decode each chunk independently
  for (let i = 0; i < chunks.length; i++) {
    try {
      const arrayBuffer = await chunks[i].arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();
      
      decodedBuffers.push(audioBuffer);
      totalDuration += audioBuffer.duration;
      
      console.log(`  ✓ Chunk ${i+1}/${chunks.length}: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);
    } catch (err) {
      console.warn(`  ✗ Chunk ${i+1}/${chunks.length} decode failed (skipping):`, err);
      skippedCount++;
    }
  }
  
  if (decodedBuffers.length === 0) {
    throw new Error('All chunks failed to decode');
  }
  
  console.log(`📊 Decoded ${decodedBuffers.length}/${chunks.length} chunks (skipped: ${skippedCount}), total duration: ${totalDuration.toFixed(2)}s`);
  
  // Calculate total samples at target sample rate
  const totalSamples = Math.ceil(totalDuration * targetSr);
  
  // Create offline context for resampling and merging
  const offlineCtx = new OfflineAudioContext(1, totalSamples, targetSr);
  
  let currentTime = 0;
  
  for (const buffer of decodedBuffers) {
    // Create source for this buffer
    const source = offlineCtx.createBufferSource();
    
    // Downmix to mono if needed
    const monoBuffer = offlineCtx.createBuffer(1, buffer.length, buffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);
    
    if (buffer.numberOfChannels === 1) {
      // Already mono
      monoData.set(buffer.getChannelData(0));
    } else {
      // Mix stereo to mono
      const L = buffer.getChannelData(0);
      const R = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        monoData[i] = 0.5 * (L[i] + R[i]);
      }
    }
    
    source.buffer = monoBuffer;
    source.connect(offlineCtx.destination);
    source.start(currentTime);
    
    currentTime += buffer.duration;
  }
  
  // Render the merged and resampled audio
  const renderedBuffer = await offlineCtx.startRendering();
  
  console.log('✅ Merged audio:', {
    samples: renderedBuffer.length,
    sampleRate: renderedBuffer.sampleRate,
    duration: renderedBuffer.duration.toFixed(2) + 's',
    channels: renderedBuffer.numberOfChannels
  });
  
  // Convert to 16-bit PCM WAV
  return audioBufferToWav16BitMono(renderedBuffer);
}

/**
 * Convert audio blob to 16kHz mono WAV format using OfflineAudioContext
 * This is optimized for Whisper: 16kHz mono reduces file size by ~75% with no quality loss
 */
async function convertToWavOfflineMono16k(audioBlob: Blob): Promise<Blob> {
  console.log('🎧 Converting to 16kHz mono WAV:', {
    inputType: audioBlob.type,
    inputSizeKB: Math.round(audioBlob.size / 1024)
  });
  
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    await audioContext.close();
    
    console.log('🎵 Decoded:', {
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration.toFixed(2) + 's'
    });
    
    // Check if already 16kHz mono WAV - skip conversion
    if (audioBuffer.sampleRate === 16000 && audioBuffer.numberOfChannels === 1 && audioBlob.type.includes('wav')) {
      console.log('⚡ Already 16kHz mono WAV, skipping conversion');
      return audioBlob;
    }
    
    // Resample to 16kHz mono using OfflineAudioContext
    const targetSr = 16000;
    const length = Math.ceil(audioBuffer.duration * targetSr);
    const offlineCtx = new OfflineAudioContext(1, length, targetSr);
    
    const source = offlineCtx.createBufferSource();
    
    // Downmix to mono
    const monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);
    
    if (audioBuffer.numberOfChannels === 1) {
      monoData.set(audioBuffer.getChannelData(0));
    } else {
      const L = audioBuffer.getChannelData(0);
      const R = audioBuffer.getChannelData(1);
      for (let i = 0; i < audioBuffer.length; i++) {
        monoData[i] = 0.5 * (L[i] + R[i]);
      }
    }
    
    source.buffer = monoBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const rendered = await offlineCtx.startRendering();
    
    console.log('✅ Resampled to 16kHz mono:', {
      samples: rendered.length,
      duration: rendered.duration.toFixed(2) + 's',
      originalSizeKB: Math.round(audioBlob.size / 1024)
    });
    
    return audioBufferToWav16BitMono(rendered);
  } catch (error) {
    await audioContext.close();
    console.error('❌ Audio conversion failed:', {
      error,
      blobType: audioBlob.type,
      blobSize: audioBlob.size
    });
    throw new Error(`Échec de conversion audio (${audioBlob.type}): ${error}`);
  }
}

// For backward compatibility (now uses the optimized version)
async function convertToWav(audioBlob: Blob): Promise<Blob> {
  return convertToWavOfflineMono16k(audioBlob);
}

/**
 * Convert AudioBuffer to 16-bit mono WAV blob (optimized for Whisper)
 */
function audioBufferToWav16BitMono(audioBuffer: AudioBuffer): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = 1 * bytesPerSample; // mono * 2 bytes
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  
  // Helper functions
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  };
  const writeU32 = (v: number) => { view.setUint32(offset, v, true); offset += 4; };
  const writeU16 = (v: number) => { view.setUint16(offset, v, true); offset += 2; };
  
  // RIFF header
  writeStr('RIFF');           // ChunkID
  writeU32(36 + dataSize);    // ChunkSize
  writeStr('WAVE');           // Format

  // fmt subchunk
  writeStr('fmt ');
  writeU32(16);               // Subchunk1Size (PCM)
  writeU16(1);                // AudioFormat (1 = PCM)
  writeU16(1);                // NumChannels (mono)
  writeU32(sampleRate);       // SampleRate
  writeU32(byteRate);         // ByteRate
  writeU16(blockAlign);       // BlockAlign
  writeU16(16);               // BitsPerSample

  // data subchunk
  writeStr('data');
  writeU32(dataSize);

  // PCM samples
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  const wavBlob = new Blob([view], { type: 'audio/wav' });
  console.log('📦 WAV created:', {
    sizeKB: Math.round(wavBlob.size / 1024),
    sampleRate,
    duration: (numSamples / sampleRate).toFixed(2) + 's'
  });
  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV blob (legacy multi-channel support)
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length * numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  
  // Write interleaved audio data
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
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

export async function checkModelAvailability(model: WhisperModel): Promise<boolean> {
  try {
    const dbName = 'transformers-cache';
    const db = await indexedDB.databases();
    const hasCache = db.some(d => d.name === dbName);
    
    if (!hasCache) {
      // Fallback: check preference if IndexedDB not available
      try {
        const { getTranscriptionDB } = await import('@/lib/transcriptionStorage');
        const prefsDB = await getTranscriptionDB();
        const pref = await prefsDB.get('prefs', `model_${model}_ready`);
        return pref?.value === true;
      } catch {
        return false;
      }
    }
    
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.close();
          resolve(false);
          return;
        }
        
        const transaction = db.transaction(['models'], 'readonly');
        const store = transaction.objectStore('models');
        const getAllRequest = store.getAllKeys();
        
        getAllRequest.onsuccess = () => {
          const keys = getAllRequest.result as string[];
          // Check for both .en and non-.en variants
          const modelIdMulti = `onnx-community/whisper-${model}`;
          const modelIdEn = `onnx-community/whisper-${model}.en`;
          const isCached = keys.some(key => key.includes(modelIdMulti) || key.includes(modelIdEn));
          
          console.log('🔍 Model availability check:', {
            model,
            isCached,
            keysFound: keys.filter(k => k.includes('whisper')).length
          });
          
          db.close();
          resolve(isCached);
        };
        
        getAllRequest.onerror = () => {
          db.close();
          resolve(false);
        };
      };
      
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Delete a model from IndexedDB cache and clear preferences
 */
export async function deleteModelCache(model: WhisperModel): Promise<void> {
  try {
    const dbName = 'transformers-cache';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      
      request.onsuccess = async () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('models')) {
          db.close();
          resolve();
          return;
        }
        
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        const getAllKeysRequest = store.getAllKeys();
        
        getAllKeysRequest.onsuccess = async () => {
          const keys = getAllKeysRequest.result as string[];
          const modelIdMulti = `whisper-${model}`;
          const modelIdEn = `whisper-${model}.en`;
          
          // Delete all keys related to this model
          const keysToDelete = keys.filter(key => 
            key.includes(modelIdMulti) || key.includes(modelIdEn)
          );
          
          for (const key of keysToDelete) {
            try {
              store.delete(key);
              console.log('🗑️ Deleted cache key:', key);
            } catch (error) {
              console.warn('Failed to delete key:', key, error);
            }
          }
          
          transaction.oncomplete = async () => {
            db.close();
            
            // Clear preferences
            try {
              const { getTranscriptionDB } = await import('@/lib/transcriptionStorage');
              const prefsDB = await getTranscriptionDB();
              await prefsDB.delete('prefs', `model_${model}_ready`);
              await prefsDB.delete('prefs', `model_${model}_device`);
              console.log('✅ Cleared preferences for model:', model);
            } catch (error) {
              console.warn('Failed to clear preferences:', error);
            }
            
            resolve();
          };
          
          transaction.onerror = () => {
            db.close();
            reject(new Error('Failed to delete model from cache'));
          };
        };
        
        getAllKeysRequest.onerror = () => {
          db.close();
          reject(new Error('Failed to read cache keys'));
        };
      };
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  } catch (error) {
    throw new Error(`Failed to delete model cache: ${error}`);
  }
}