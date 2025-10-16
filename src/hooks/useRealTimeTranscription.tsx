import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudio, type WhisperModel } from "@/lib/whisperService";
import { generateSummary } from "@/lib/llmService";
import { storeAudioBlob, storeTranscriptResult } from "@/lib/transcriptionStorage";
import { toast } from "@/hooks/use-toast";

interface UseRealTimeTranscriptionProps {
  sessionId: string;
  clientId: string;
  onTranscriptUpdate: (text: string) => void;
  model?: WhisperModel;
}

interface UseRealTimeTranscriptionResult {
  isTranscribing: boolean;
  progress: number;
  currentTranscript: string;
  isGeneratingSummary: boolean;
  processAudioChunk: (blob: Blob) => Promise<void>;
  startRealTimeTranscription: () => void;
  stopRealTimeTranscription: () => void;
  generateContextualSummary: () => Promise<string | null>;
  clearTranscript: () => void;
  flushPendingChunk: () => Promise<void>;
}

/**
 * Clean repetitive text loops (n-gram deduplication)
 * Replaces sequences of 3-20 characters repeated 2+ times with just 2 repetitions
 */
function dedupeLoops(text: string): string {
  // Remove repetitions of sequences 3-20 chars repeated ≥3 times
  return text.replace(/(.{3,20}?)\1{2,}/g, '$1$1');
}

/**
 * Concatenates multiple WAV blobs into a single valid WAV file
 * Extracts PCM data from each blob and creates a single header
 * Inserts 100ms silence between chunks to prevent Whisper looping
 */
async function concatenateWAVBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) {
    throw new Error('No blobs to concatenate');
  }
  
  if (blobs.length === 1) {
    return blobs[0]; // No concatenation needed
  }

  console.log('🔗 Concatenating', blobs.length, 'WAV chunks...');

  // Read all buffers
  const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));

  interface WavPart {
    dataView: DataView;
    dataOffset: number;
    dataSize: number;
    sampleRate: number;
    numChannels: number;
    bitsPerSample: number;
  }

  const parts: WavPart[] = [];
  
  for (const buf of buffers) {
    const dv = new DataView(buf);
    
    // Check RIFF header
    const riff = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    if (riff !== 'RIFF') {
      console.error('❌ Invalid WAV: missing RIFF header');
      throw new Error('Invalid WAV file: missing RIFF header');
    }
    
    // Check WAVE format
    const wave = String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11));
    if (wave !== 'WAVE') {
      console.error('❌ Invalid WAV: missing WAVE format');
      throw new Error('Invalid WAV file: missing WAVE format');
    }
    
    // Find fmt chunk
    let offset = 12;
    let fmtFound = false;
    let sampleRate = 0, numChannels = 0, bitsPerSample = 0, audioFormat = 0;
    
    while (offset < dv.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dv.getUint8(offset), dv.getUint8(offset + 1),
        dv.getUint8(offset + 2), dv.getUint8(offset + 3)
      );
      const chunkSize = dv.getUint32(offset + 4, true);
      
      if (chunkId === 'fmt ') {
        fmtFound = true;
        audioFormat = dv.getUint16(offset + 8, true);
        numChannels = dv.getUint16(offset + 10, true);
        sampleRate = dv.getUint32(offset + 12, true);
        bitsPerSample = dv.getUint16(offset + 22, true);
        
        // Verify PCM format
        if (audioFormat !== 1) {
          console.error('❌ Not PCM format:', audioFormat);
          throw new Error(`WAV must be PCM format (got ${audioFormat})`);
        }
        
        // Verify 16kHz mono 16-bit
        if (sampleRate !== 16000) {
          console.warn('⚠️ Sample rate not 16kHz:', sampleRate);
        }
        if (numChannels !== 1) {
          console.warn('⚠️ Not mono:', numChannels, 'channels');
        }
        if (bitsPerSample !== 16) {
          console.warn('⚠️ Not 16-bit:', bitsPerSample);
        }
        
        offset += 8 + chunkSize;
        break;
      }
      
      offset += 8 + chunkSize;
    }
    
    if (!fmtFound) {
      console.error('❌ fmt chunk not found');
      throw new Error('WAV fmt chunk not found');
    }
    
    // Find data chunk
    let dataOffset = 0;
    let dataSize = 0;
    let dataFound = false;
    
    while (offset < dv.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dv.getUint8(offset), dv.getUint8(offset + 1),
        dv.getUint8(offset + 2), dv.getUint8(offset + 3)
      );
      const chunkSize = dv.getUint32(offset + 4, true);
      
      if (chunkId === 'data') {
        dataFound = true;
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }
      
      offset += 8 + chunkSize;
    }
    
    if (!dataFound) {
      console.error('❌ data chunk not found');
      throw new Error('WAV data chunk not found');
    }
    
    parts.push({
      dataView: dv,
      dataOffset,
      dataSize,
      sampleRate,
      numChannels,
      bitsPerSample
    });
  }
  
  // Verify all parts have same format
  const ref = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].sampleRate !== ref.sampleRate ||
        parts[i].numChannels !== ref.numChannels ||
        parts[i].bitsPerSample !== ref.bitsPerSample) {
      console.error('❌ Incompatible WAV formats');
      throw new Error('All WAV files must have same format');
    }
  }
  
  // Calculate total data size + silence padding (100ms = 1600 samples @ 16kHz)
  const SILENCE_SAMPLES = 1600; // 100ms @ 16kHz
  const SILENCE_BYTES = SILENCE_SAMPLES * 2; // 16-bit = 2 bytes per sample
  const silencePadding = (parts.length - 1) * SILENCE_BYTES; // Between chunks only
  const totalDataSize = parts.reduce((acc, p) => acc + p.dataSize, 0) + silencePadding;
  console.log('📊 Total PCM data:', totalDataSize, 'bytes (including', silencePadding, 'bytes silence padding)');
  
  // Create output buffer with single header
  const outputSize = 44 + totalDataSize;
  const output = new ArrayBuffer(outputSize);
  const view = new DataView(output);
  
  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalDataSize, true); // ChunkSize
  writeString(8, 'WAVE');
  
  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (PCM)
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, ref.numChannels, true);
  view.setUint32(24, ref.sampleRate, true);
  view.setUint32(28, ref.sampleRate * ref.numChannels * (ref.bitsPerSample / 8), true); // ByteRate
  view.setUint16(32, ref.numChannels * (ref.bitsPerSample / 8), true); // BlockAlign
  view.setUint16(34, ref.bitsPerSample, true);
  
  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, totalDataSize, true);
  
  // Copy PCM data from all parts with silence padding between
  let writeOffset = 44;
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    
    // Copy chunk data
    for (let i = 0; i < part.dataSize; i++) {
      view.setUint8(writeOffset++, part.dataView.getUint8(part.dataOffset + i));
    }
    
    // Insert 100ms silence between chunks (not after last)
    if (idx < parts.length - 1) {
      for (let i = 0; i < SILENCE_BYTES; i++) {
        view.setUint8(writeOffset++, 0);
      }
    }
  }
  
  console.log('✅ WAV concatenation complete:', {
    chunks: parts.length,
    totalSize: outputSize,
    totalDataSize,
    sampleRate: ref.sampleRate,
    channels: ref.numChannels,
    bits: ref.bitsPerSample
  });
  
  return new Blob([view], { type: 'audio/wav' });
}

export const useRealTimeTranscription = ({
  sessionId,
  clientId,
  onTranscriptUpdate,
  model = 'tiny'
}: UseRealTimeTranscriptionProps): UseRealTimeTranscriptionResult => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const isActiveRef = useRef(false);
  const lastSummaryPositionRef = useRef(0);
  const transcriptRef = useRef('');
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  
  // VAD (Voice Activity Detection) state
  const vadBufferRef = useRef<Blob[]>([]);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const audioLevelsRef = useRef<number[]>([]);
  const vadThresholdRef = useRef<number>(0.005); // Lower initial threshold

  const processOne = useCallback(async (audioBlob: Blob) => {
    console.log('⏩ processOne start:', {
      type: audioBlob.type,
      size: audioBlob.size,
      sizeKB: Math.round(audioBlob.size / 1024)
    });
    
    try {
      setProgress(30);
      
      // Very permissive size validation (VAD handles quality)
      const minSize = 1000; // 1KB minimum
      if (audioBlob.size < minSize) {
        console.log('⚠️ Chunk too small, skipping:', audioBlob.size, 'bytes');
        return;
      }

      // Log detailed audio info for debugging
      console.log('🎙️ Processing audio chunk:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeKB: Math.round(audioBlob.size / 1024)
      });

      // Transcribe the chunk (language forced to French)
      const result = await transcribeAudio(audioBlob, {
        model: model,
        language: 'fr', // Always French
        mode: 'auto',
        onProgress: (p) => setProgress(30 + (p * 0.4))
      });

      setProgress(80);

      let transcriptText = result.text?.trim() ?? "";
      if (!transcriptText) { 
        setProgress(0); 
        return; 
      }

      // --- Enhanced anti-hallucination guard: detect word repetitions (1-3 words) ---
      // Adaptive thresholds based on model (base is more lenient with natural speech)
      const thresholds = model === 'base' 
        ? { oneWord: 6, twoWord: 4, threeWord: 4 }
        : { oneWord: 4, twoWord: 3, threeWord: 3 };
      
      const hasRepetition = (() => {
        const words = transcriptText.split(/\s+/).map(w => w.toLowerCase());
        
        // Check 1-word repetitions (e.g., "et et et et...")
        for (let i = 1; i < words.length; i++) {
          if (words[i] === words[i-1]) {
            let streak = 2;
            for (let j = i+1; j < words.length && words[j] === words[i]; j++) {
              streak++;
            }
            if (streak >= thresholds.oneWord) {
              console.warn(`🧹 1-word repetition detected: "${words[i]}" x${streak} (threshold: ${thresholds.oneWord})`);
              return true;
            }
          }
        }
        
        // Check 2-word repetitions (e.g., "merci beaucoup merci beaucoup...")
        for (let i = 2; i < words.length; i += 2) {
          const bigram = words.slice(i-2, i).join(" ");
          let streak = 1;
          for (let j = i; j < words.length - 1; j += 2) {
            const nextBigram = words.slice(j, j+2).join(" ");
            if (nextBigram === bigram) {
              streak++;
              if (streak >= thresholds.twoWord) {
                console.warn(`🧹 2-word repetition detected: "${bigram}" x${streak} (threshold: ${thresholds.twoWord})`);
                return true;
              }
            } else {
              break;
            }
          }
        }
        
        // Check 3-word repetitions
        for (let i = 3; i < words.length; i++) {
          const trigram = words.slice(i-3, i).join(" ");
          let streak = 1;
          for (let j = i; j < words.length - 2; j += 3) {
            const nextTrigram = words.slice(j, j+3).join(" ");
            if (nextTrigram === trigram) {
              streak++;
              if (streak >= thresholds.threeWord) {
                console.warn(`🧹 3-word repetition detected: "${trigram}" x${streak} (threshold: ${thresholds.threeWord})`);
                return true;
              }
            } else {
              break;
            }
          }
        }
        
        return false;
      })();
      
      if (hasRepetition) {
        console.warn("🧹 Segment ignoré (répétitions détectées - hallucination du modèle)");
        
        // Adaptive message based on current model
        const suggestion = model === 'tiny' 
          ? "Répétitions détectées. Essayez le modèle 'base' pour plus de précision."
          : model === 'base'
          ? "Répétitions détectées (hallucination du modèle). Segment ignoré."
          : "Répétitions détectées. Essayez un modèle plus robuste (base ou large).";
        
        toast({
          title: "Segment ignoré",
          description: suggestion,
          variant: "default"
        });
        // TEMPORARILY DISABLED: Allow processing to verify clean transcription after downmix fix
        // setProgress(0);
        // return;
      }
      
      // Log raw text before processing (debug)
      console.log('📝 Raw transcription text:', transcriptText);
      
      // Apply n-gram deduplication to break loops
      const cleanedText = dedupeLoops(transcriptText);
      if (cleanedText !== transcriptText) {
        console.log('🧹 Cleaned repetitions:', {
          before: transcriptText.substring(0, 100),
          after: cleanedText.substring(0, 100)
        });
        transcriptText = cleanedText;
      }

      // Append to current transcript
      const newTranscript = (transcriptRef.current ? transcriptRef.current + '\n\n' : '') + transcriptText;
      transcriptRef.current = newTranscript;
      setCurrentTranscript(newTranscript);
      onTranscriptUpdate(newTranscript);

      await storeAudioBlob(audioBlob, sessionId, clientId);
      await storeTranscriptResult({
        audio_id: Date.now().toString(),
        model, 
        lang: 'fr',
        text: transcriptText,
        segments: result.segments,
        srt: result.srt
      });

      setProgress(100);
      setTimeout(() => setProgress(0), 400);
    } catch (err) {
      console.error('Real-time transcription error:', err);
      toast({ 
        title: "Échec d'un segment", 
        description: "La transcription continue...", 
        variant: "default" 
      });
      setProgress(0);
    } finally {
      console.log('✅ processOne end');
    }
  }, [clientId, onTranscriptUpdate, sessionId, model]);

  const pump = useCallback(async () => {
    if (processingRef.current) {
      console.log('⏸️ Pump already running, skipping...');
      return;
    }
    
    console.log('🚀 Pump started, queue size:', queueRef.current.length);
    processingRef.current = true;
    
    try {
      while (queueRef.current.length) {
        const audioBlob = queueRef.current.shift()!;
        console.log('🎙️ Processing audio chunk from queue:', {
          size: audioBlob.size,
          type: audioBlob.type,
          sizeKB: Math.round(audioBlob.size / 1024)
        });
        await processOne(audioBlob);
      }
      console.log('✅ Pump finished');
    } finally {
      processingRef.current = false;
    }
  }, [processOne]);

  const processAudioChunk = useCallback(async (blob: Blob) => {
    if (!isActiveRef.current) return;
    
    // Analyze audio level for VAD
    const audioLevel = await analyzeAudioLevel(blob);
    audioLevelsRef.current.push(audioLevel);
    
    // Keep only last 20 readings for adaptive threshold
    if (audioLevelsRef.current.length > 20) {
      audioLevelsRef.current.shift();
    }
    
    // Update adaptive threshold with lower minimum (0.003)
    const avgLevel = audioLevelsRef.current.length > 0 
      ? audioLevelsRef.current.reduce((a, b) => a + b, 0) / audioLevelsRef.current.length 
      : 0.01;
    vadThresholdRef.current = Math.max(0.003, avgLevel * 0.3); // Lower threshold, 30% of average
    
    console.log('🎤 Audio level:', {
      current: audioLevel.toFixed(3),
      threshold: vadThresholdRef.current.toFixed(3),
      avgLevel: avgLevel.toFixed(3),
      blobSizeKB: Math.round(blob.size / 1024)
    });
    
    // VAD with fallback: if audioLevel is 0 but blob is significant, treat as activity
    const hasActivity = audioLevel > vadThresholdRef.current || (audioLevel === 0 && blob.size >= 10000);
    
    if (hasActivity) {
      lastActivityTimeRef.current = Date.now();
      vadBufferRef.current.push(blob);
      console.log('✅ Activity detected, buffering... (buffer size:', vadBufferRef.current.length, ')');
      
      // FORCED FLUSH: If buffer reaches 3 chunks (~18 seconds of continuous speech), flush it
      if (vadBufferRef.current.length >= 3) {
        console.log('⚡ Forced flush (buffer full):', vadBufferRef.current.length, 'chunks');
        
        // Properly concatenate WAV blobs
        try {
          const concatenated = await concatenateWAVBlobs(vadBufferRef.current);
          queueRef.current.push(concatenated);
          vadBufferRef.current = [];
          pump();
        } catch (error) {
          console.error('❌ WAV concatenation failed:', error);
          vadBufferRef.current = [];
        }
      }
    } else {
      const timeSinceActivity = Date.now() - lastActivityTimeRef.current;
      
      // If we have buffered audio and 1.5s of silence, process the buffer
      if (vadBufferRef.current.length > 0 && timeSinceActivity > 1500) {
        console.log('🔇 Silence detected, processing buffer...', {
          bufferSize: vadBufferRef.current.length,
          silenceDuration: timeSinceActivity
        });
        
        // Properly concatenate WAV blobs
        try {
          const concatenated = await concatenateWAVBlobs(vadBufferRef.current);
          queueRef.current.push(concatenated);
          vadBufferRef.current = [];
          pump();
        } catch (error) {
          console.error('❌ WAV concatenation failed:', error);
          vadBufferRef.current = [];
        }
      }
    }
  }, [pump]);

  // Analyze audio level from blob for VAD
  const analyzeAudioLevel = async (blob: Blob): Promise<number> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Calculate RMS (root mean square) for audio level
        let sum = 0;
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        
        await audioContext.close();
        return rms;
      } catch {
        await audioContext.close();
        return 0;
      }
    } catch {
      return 0;
    }
  };


  const startRealTimeTranscription = useCallback(() => {
    setIsTranscribing(true);
    isActiveRef.current = true;
    
    toast({
      title: "Transcription temps réel",
      description: "Transcription automatique des segments audio"
    });
  }, []);

  const stopRealTimeTranscription = useCallback(async () => {
    setIsTranscribing(false);
    
    // Flush any pending audio before stopping
    await flushPendingChunk();
    
    // Now block new chunks
    isActiveRef.current = false;
    setProgress(0);

    toast({
      title: "Transcription arrêtée",
      description: "Transcription temps réel interrompue"
    });
  }, []);

  const generateContextualSummary = useCallback(async (): Promise<string | null> => {
    if (!currentTranscript.trim()) return null;

    setIsGeneratingSummary(true);

    try {
      // Only summarize new content since last summary
      const newContent = currentTranscript.slice(lastSummaryPositionRef.current);
      
      if (newContent.trim().length < 100) {
        toast({
          title: "Contenu insuffisant",
          description: "Pas assez de nouveau contenu pour générer un résumé",
          variant: "destructive"
        });
        return null;
      }

      const summary = await generateSummary(newContent, {
        onProgress: (chunk) => {
          // Visual feedback could be added here
        }
      });

      // Update the position marker
      lastSummaryPositionRef.current = currentTranscript.length;

      toast({
        title: "Résumé généré",
        description: "Résumé contextuel créé avec succès"
      });

      return summary;

    } catch (error) {
      console.error('Summary generation error:', error);
      toast({
        title: "Erreur de résumé",
        description: "Impossible de générer le résumé",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [currentTranscript]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setCurrentTranscript('');
    lastSummaryPositionRef.current = 0;
    onTranscriptUpdate('');
  }, [onTranscriptUpdate]);

  const flushPendingChunk = useCallback(async () => {
    // Flush any remaining VAD buffer
    if (vadBufferRef.current.length > 0) {
      console.log('🔄 Flushing pending VAD buffer...', vadBufferRef.current.length, 'chunks');
      
      // Properly concatenate WAV blobs
      try {
        const concatenated = await concatenateWAVBlobs(vadBufferRef.current);
        queueRef.current.push(concatenated);
        vadBufferRef.current = [];
      } catch (error) {
        console.error('❌ WAV concatenation failed in flush:', error);
        vadBufferRef.current = [];
      }
    }

    // Wait for queue to empty (max 5s)
    const maxWaitMs = 5000;
    const start = Date.now();
    while ((queueRef.current.length > 0 || processingRef.current) && Date.now() - start < maxWaitMs) {
      await new Promise(res => setTimeout(res, 50));
    }
    
    console.log('✅ Flush complete. Queue empty:', queueRef.current.length === 0, 'Processing:', processingRef.current);
  }, []);

  // Reset state when switching clients/sessions or changing settings
  useEffect(() => {
    console.log('🔄 Context changed, resetting transcription state...', {
      clientId,
      sessionId,
      model
    });
    
    // Clear all buffers and state
    vadBufferRef.current = [];
    queueRef.current = [];
    audioLevelsRef.current = [];
    lastActivityTimeRef.current = Date.now();
    transcriptRef.current = '';
    setCurrentTranscript('');
    lastSummaryPositionRef.current = 0;
    processingRef.current = false;
    isActiveRef.current = false;
    setIsTranscribing(false);
    setProgress(0);
    
  }, [clientId, sessionId, model]);

  return {
    isTranscribing,
    progress,
    currentTranscript,
    isGeneratingSummary,
    processAudioChunk,
    startRealTimeTranscription,
    stopRealTimeTranscription,
    generateContextualSummary,
    clearTranscript,
    flushPendingChunk
  };
};