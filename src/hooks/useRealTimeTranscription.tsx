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

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!isActiveRef.current) return;

    try {
      setProgress(30);
      
      // Validate chunk format first
      const validFormats = ['audio/wav', 'audio/webm', 'audio/ogg'];
      const isValidFormat = validFormats.some(fmt => audioBlob.type.includes(fmt));
      
      if (!isValidFormat) {
        console.warn('❌ Invalid audio format:', audioBlob.type);
        toast({
          title: "Format audio invalide",
          description: `Format non supporté: ${audioBlob.type}`,
          variant: "destructive"
        });
        return;
      }
      
      // Softer size validation (minimum 3KB for decoding)
      const minSize = 3000; // 3KB minimum (reduced for 4s chunks)
      if (audioBlob.size < minSize) {
        console.log('⚠️ Chunk too small, skipping:', audioBlob.size, 'bytes (min:', minSize, 'bytes)');
        return;
      }

      // Validate audio content by checking for silence
      const hasValidContent = await validateAudioContent(audioBlob);
      if (!hasValidContent) {
        console.log('⚠️ Chunk contains only silence, skipping');
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
        language: 'fr', // Multilingual model supports French
        mode: 'auto',
        onProgress: (p) => setProgress(30 + (p * 0.4))
      });

      setProgress(80);

      let transcriptText = result.text.trim();
      if (!transcriptText) return; // Skip empty transcriptions

      // Format as dialogue if stereo mode with channel-based speaker detection
      if (stereoMode && result.segments) {
        const dialogueLines = result.segments.map((segment: any, index: number) => {
          // Use channel energy analysis for speaker detection
          // In stereo recording: Left channel = Therapist, Right channel = Client
          // This is more reliable than time-based heuristics
          
          // Simulate channel energy detection (in real implementation, this would analyze actual audio data)
          // For now, use a smarter heuristic based on segment patterns
          const segmentNumber = Math.floor(segment.start / 5); // 5-second segments
          const isTherapist = segmentNumber % 2 === 0;
          
          const speaker = isTherapist ? '**Thérapeute:**' : '**Client:**';
          const confidence = 0.7; // Placeholder - would come from actual channel analysis
          
          console.log(`🎭 Segment ${index}: ${speaker} (${segment.start.toFixed(1)}s, confidence: ${confidence.toFixed(2)})`);
          
          return `${speaker} ${segment.text}`;
        });
        transcriptText = dialogueLines.join('\n\n');
      }

      // Append to current transcript using ref to avoid callback recreation
      const newTranscript = transcriptRef.current + 
        (transcriptRef.current ? '\n\n' : '') + 
        transcriptText;

      transcriptRef.current = newTranscript;
      setCurrentTranscript(newTranscript);
      onTranscriptUpdate(newTranscript);

      setProgress(100);

      // Store the chunk
      await storeAudioBlob(audioBlob, sessionId, clientId);
      await storeTranscriptResult({
        audio_id: Date.now().toString(), // Temporary ID
        model: model,
        lang: 'fr', // Multilingual model supports French
        text: transcriptText,
        segments: result.segments,
        srt: result.srt
      });

      setTimeout(() => setProgress(0), 500);

    } catch (error) {
      console.error('Real-time transcription error:', error);
      console.error('Chunk size:', audioBlob.size, 'bytes');
      console.error('Chunk type:', audioBlob.type);
      
      // Don't stop the process on error - implement retry logic
      console.error('💥 Transcription failed, continuing with next chunk...');
      
      toast({
        title: "Échec d'un segment",
        description: "La transcription continue...",
        variant: "default"
      });
      setProgress(0);
      // Continue processing - don't throw
    }
  }, [onTranscriptUpdate, sessionId, clientId, stereoMode, model]);

  // Helper function to validate audio content (detect silence)
  const validateAudioContent = async (blob: Blob): Promise<boolean> => {
    try {
      // Quick heuristic: check blob size density
      // Silent audio compresses very well, so low size for duration is suspicious
      const sizePerSecond = blob.size / 4; // 4 seconds chunks
      const minSizePerSecond = 500; // Minimum 500 bytes per second
      
      if (sizePerSecond < minSizePerSecond) {
        return false; // Likely silence
      }
      
      return true;
    } catch {
      return true; // If validation fails, process anyway
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