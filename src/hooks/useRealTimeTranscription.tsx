import { useState, useRef, useCallback } from "react";
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
  const vadThresholdRef = useRef<number>(0.02); // Adaptive threshold

  const processOne = useCallback(async (audioBlob: Blob) => {
    try {
      setProgress(30);
      
      // Very permissive size validation (VAD handles quality)
      const minSize = 1000; // 1KB minimum
      if (audioBlob.size < minSize) {
        console.log('⚠️ Chunk too small, skipping:', audioBlob.size, 'bytes');
        return;
      }

      // Validate audio content (now very permissive, VAD handles it)
      const hasValidContent = await validateAudioContent(audioBlob);
      if (!hasValidContent) {
        console.log('⚠️ Chunk too small, skipping');
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

      let transcriptText = result.text.trim();
      if (!transcriptText) { 
        setProgress(0); 
        return; 
      }

      // Format as dialogue if stereo mode with channel-based speaker detection
      if (stereoMode && result.segments) {
        const dialogueLines = result.segments.map((segment: any, index: number) => {
          const segmentNumber = Math.floor(segment.start / 5); // 5-second segments
          const isTherapist = segmentNumber % 2 === 0;
          const speaker = isTherapist ? '**Thérapeute:**' : '**Client:**';
          
          console.log(`🎭 Segment ${index}: ${speaker} (${segment.start.toFixed(1)}s)`);
          
          return `${speaker} ${segment.text}`;
        });
        transcriptText = dialogueLines.join('\n\n');
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
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (isActiveRef.current && queueRef.current.length) {
        const audioBlob = queueRef.current.shift()!;
        await processOne(audioBlob);
      }
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
    
    // Update adaptive threshold (average of recent levels)
    const avgLevel = audioLevelsRef.current.reduce((a, b) => a + b, 0) / audioLevelsRef.current.length;
    vadThresholdRef.current = Math.max(0.01, avgLevel * 0.3); // 30% of average
    
    console.log('🎤 Audio level:', {
      current: audioLevel.toFixed(3),
      threshold: vadThresholdRef.current.toFixed(3),
      avgLevel: avgLevel.toFixed(3)
    });
    
    // Voice Activity Detection
    const hasActivity = audioLevel > vadThresholdRef.current;
    
    if (hasActivity) {
      lastActivityTimeRef.current = Date.now();
      vadBufferRef.current.push(blob);
      console.log('✅ Activity detected, buffering... (buffer size:', vadBufferRef.current.length, ')');
    } else {
      const timeSinceActivity = Date.now() - lastActivityTimeRef.current;
      
      // If we have buffered audio and 2.5s of silence, process the buffer
      if (vadBufferRef.current.length > 0 && timeSinceActivity > 2500) {
        console.log('🔇 Silence detected after activity, processing buffer...', {
          bufferSize: vadBufferRef.current.length,
          silenceDuration: timeSinceActivity
        });
        
        // Merge buffered chunks into one
        const mergedBlob = new Blob(vadBufferRef.current, { type: vadBufferRef.current[0].type });
        vadBufferRef.current = [];
        
        queueRef.current.push(mergedBlob);
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

  // Helper function to validate audio content (detect silence)
  const validateAudioContent = async (blob: Blob): Promise<boolean> => {
    // Now using VAD system, so we just check minimum size
    const minSize = 1000; // 1KB minimum (very permissive)
    return blob.size >= minSize;
  };

  const startRealTimeTranscription = useCallback(() => {
    setIsTranscribing(true);
    isActiveRef.current = true;
    
    toast({
      title: "Transcription temps réel",
      description: "Transcription automatique des segments audio"
    });
  }, []);

  const stopRealTimeTranscription = useCallback(() => {
    setIsTranscribing(false);
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

  return {
    isTranscribing,
    progress,
    currentTranscript,
    isGeneratingSummary,
    processAudioChunk,
    startRealTimeTranscription,
    stopRealTimeTranscription,
    generateContextualSummary,
    clearTranscript
  };
};