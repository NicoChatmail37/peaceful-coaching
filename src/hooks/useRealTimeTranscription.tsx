import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudio, type WhisperModel } from "@/lib/whisperService";
import { generateSummary } from "@/lib/llmService";
import { storeAudioBlob, storeTranscriptResult } from "@/lib/transcriptionStorage";
import { toast } from "@/hooks/use-toast";

interface UseRealTimeTranscriptionProps {
  sessionId: string;
  clientId: string;
  onTranscriptUpdate: (text: string) => void;
  stereoMode?: boolean;
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

export const useRealTimeTranscription = ({
  sessionId,
  clientId,
  onTranscriptUpdate,
  stereoMode = false,
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
        sizeKB: Math.round(audioBlob.size / 1024),
        stereoMode: stereoMode
      });

      // Transcribe the chunk
      const result = await transcribeAudio(audioBlob, {
        model: model,
        language: 'fr',
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
        setProgress(0);
        return;
      }

      // --- Robust stereo formatting with seg.t0 ---
      if (stereoMode && Array.isArray(result.segments) && result.segments.length) {
        const dialogueLines = result.segments.map((seg: any, i: number) => {
          const start = Number.isFinite(seg?.t0) ? seg.t0 : 0;
          const segmentNumber = Math.floor(start / 5);
          const isTherapist = segmentNumber % 2 === 0;
          const speaker = isTherapist ? '**Thérapeute:**' : '**Client:**';
          
          try {
            console.log(`🎭 Segment ${i}: ${speaker} (${start.toFixed(1)}s)`);
          } catch {
            console.log(`🎭 Segment ${i}: ${speaker}`);
          }
          
          return `${speaker} ${seg.text ?? ""}`.trim();
        });
        transcriptText = dialogueLines.join('\n\n').trim();
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
    }
  }, [clientId, onTranscriptUpdate, sessionId, stereoMode, model]);

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
      
      // FORCED FLUSH: If buffer reaches 2 chunks (~6 seconds of continuous speech), flush it
      if (vadBufferRef.current.length >= 2) {
        console.log('⚡ Forced flush (buffer full): concatenating', vadBufferRef.current.length, 'chunks');
        
        // Simple Blob concatenation (no conversion) - WebM/Opus is valid for Whisper
        const concatenated = new Blob(vadBufferRef.current, { 
          type: vadBufferRef.current[0].type || 'audio/webm' 
        });
        
        vadBufferRef.current = [];
        queueRef.current.push(concatenated);
        pump();
      }
    } else {
      const timeSinceActivity = Date.now() - lastActivityTimeRef.current;
      
      // If we have buffered audio and 1.5s of silence, process the buffer
      if (vadBufferRef.current.length > 0 && timeSinceActivity > 1500) {
        console.log('🔇 Silence detected, concatenating buffer...', {
          bufferSize: vadBufferRef.current.length,
          silenceDuration: timeSinceActivity
        });
        
        // Simple Blob concatenation (no conversion) - WebM/Opus is valid for Whisper
        const concatenated = new Blob(vadBufferRef.current, { 
          type: vadBufferRef.current[0].type || 'audio/webm' 
        });
        
        vadBufferRef.current = [];
        queueRef.current.push(concatenated);
        pump();
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
      
      // Simple Blob concatenation (no conversion) - WebM/Opus is valid for Whisper
      const concatenated = new Blob(vadBufferRef.current, { 
        type: vadBufferRef.current[0].type || 'audio/webm' 
      });
      
      vadBufferRef.current = [];
      queueRef.current.push(concatenated);
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
      model,
      stereoMode
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
    
  }, [clientId, sessionId, model, stereoMode]);

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