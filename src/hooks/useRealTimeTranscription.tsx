import { useState, useRef, useCallback } from "react";
import { transcribeAudio } from "@/lib/whisperService";
import { generateSummary } from "@/lib/llmService";
import { storeAudioBlob, storeTranscriptResult } from "@/lib/transcriptionStorage";
import { toast } from "@/hooks/use-toast";

interface UseRealTimeTranscriptionProps {
  sessionId: string;
  clientId: string;
  onTranscriptUpdate: (text: string) => void;
  stereoMode?: boolean;
  chunkDurationMs?: number; // Durée des chunks en ms (default: 10000 = 10s)
}

interface UseRealTimeTranscriptionResult {
  isTranscribing: boolean;
  progress: number;
  currentTranscript: string;
  isGeneratingSummary: boolean;
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
  chunkDurationMs = 10000
}: UseRealTimeTranscriptionProps): UseRealTimeTranscriptionResult => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isActiveRef = useRef(false);
  const lastSummaryPositionRef = useRef(0);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!isActiveRef.current) return;

    try {
      setProgress(30);
      
      // Transcribe the chunk
      const result = await transcribeAudio(audioBlob, {
        model: 'tiny', // Use fastest model for real-time
        language: 'fr',
        mode: 'auto',
        onProgress: (p) => setProgress(30 + (p * 0.4))
      });

      setProgress(80);

      let transcriptText = result.text;

      // Format as dialogue if stereo mode
      if (stereoMode && result.segments) {
        const dialogueLines = result.segments.map((segment: any) => {
          // Simple heuristic: alternate speakers based on timing
          const isTherapist = Math.floor(segment.start / 30) % 2 === 0;
          const speaker = isTherapist ? '**Thérapeute:**' : '**Client:**';
          return `${speaker} ${segment.text}`;
        });
        transcriptText = dialogueLines.join('\n\n');
      }

      // Append to current transcript
      const newTranscript = currentTranscript + 
        (currentTranscript ? '\n\n' : '') + 
        transcriptText;

      setCurrentTranscript(newTranscript);
      onTranscriptUpdate(newTranscript);

      setProgress(100);

      // Store the chunk
      await storeAudioBlob(audioBlob, sessionId, clientId);
      await storeTranscriptResult({
        audio_id: Date.now().toString(), // Temporary ID
        model: 'tiny',
        lang: 'fr',
        text: transcriptText,
        segments: result.segments,
        srt: result.srt
      });

      setTimeout(() => setProgress(0), 500);

    } catch (error) {
      console.error('Real-time transcription error:', error);
      toast({
        title: "Erreur de transcription",
        description: "Impossible de transcrire le segment audio",
        variant: "destructive"
      });
      setProgress(0);
    }
  }, [currentTranscript, onTranscriptUpdate, sessionId, clientId, stereoMode]);

  const startChunkedTranscription = useCallback(() => {
    transcriptionIntervalRef.current = setInterval(async () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        return;
      }

      // Trigger dataavailable event to get current chunk
      mediaRecorderRef.current.requestData();
    }, chunkDurationMs);
  }, [chunkDurationMs]);

  const startRealTimeTranscription = useCallback(() => {
    setIsTranscribing(true);
    isActiveRef.current = true;
    audioChunksRef.current = [];
    
    toast({
      title: "Transcription temps réel",
      description: "Transcription automatique toutes les 10 secondes"
    });

    // Start chunked transcription after a short delay
    setTimeout(startChunkedTranscription, 2000);
  }, [startChunkedTranscription]);

  const stopRealTimeTranscription = useCallback(() => {
    setIsTranscribing(false);
    isActiveRef.current = false;
    setProgress(0);
    
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }

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
    setCurrentTranscript('');
    lastSummaryPositionRef.current = 0;
    onTranscriptUpdate('');
  }, [onTranscriptUpdate]);

  return {
    isTranscribing,
    progress,
    currentTranscript,
    isGeneratingSummary,
    startRealTimeTranscription,
    stopRealTimeTranscription,
    generateContextualSummary,
    clearTranscript
  };
};