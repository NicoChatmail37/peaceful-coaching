import { useState, useCallback, useEffect } from 'react';
import {
  AudioChunk,
  storeAudioChunk,
  getAudioChunk,
  getAudioChunksBySession,
  getUntranscribedChunks,
  updateChunkTranscription,
  updateChunkStereoTranscription,
  deleteAudioChunk,
  deleteChunksBySession,
} from '@/lib/audioChunksStorage';
import { transcribeAudio, type WhisperModel } from '@/lib/whisperService';
import { transcribeViaBridgeStereo } from '@/services/bridgeClient';
import { toast } from 'sonner';

interface UseAudioChunksOptions {
  sessionId?: string;
  clientId?: string;
  autoRefresh?: boolean;
}

export const useAudioChunks = (options: UseAudioChunksOptions = {}) => {
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState<Record<string, boolean>>({});

  /**
   * Refresh chunks list from IndexedDB
   */
  const refreshChunks = useCallback(async () => {
    if (!options.sessionId) return;
    
    setIsLoading(true);
    try {
      const sessionChunks = await getAudioChunksBySession(options.sessionId);
      setChunks(sessionChunks);
    } catch (error) {
      console.error('Failed to refresh chunks:', error);
      toast.error('Erreur lors du chargement des morceaux');
    } finally {
      setIsLoading(false);
    }
  }, [options.sessionId]);

  /**
   * Add a new audio chunk
   */
  const addChunk = useCallback(
    async (
      blob: Blob,
      duration: number,
      source: 'recorded' | 'uploaded' = 'recorded',
      fileName?: string
    ): Promise<string> => {
      try {
        const chunkId = await storeAudioChunk(blob, {
          sessionId: options.sessionId,
          clientId: options.clientId,
          duration,
          source,
          fileName,
        });

        await refreshChunks();
        toast.success(`Morceau ${source === 'uploaded' ? 'importé' : 'enregistré'} (${Math.round(duration)}s)`);
        return chunkId;
      } catch (error) {
        console.error('Failed to add chunk:', error);
        toast.error("Erreur lors de l'ajout du morceau");
        throw error;
      }
    },
    [options.sessionId, options.clientId, refreshChunks]
  );

  /**
   * Transcribe a specific chunk
   */
  const transcribeChunk = useCallback(
    async (chunkId: string, modelId: WhisperModel = 'base'): Promise<string> => {
      setIsTranscribing(prev => ({ ...prev, [chunkId]: true }));

      try {
        const chunk = await getAudioChunk(chunkId);
        if (!chunk) {
          throw new Error('Chunk not found');
        }

        if (chunk.transcribed) {
          toast.info('Ce morceau est déjà transcrit');
          return chunk.transcriptText || '';
        }

        console.log('🎤 Transcribing chunk:', chunkId);
        const result = await transcribeAudio(chunk.blob, { 
          model: modelId,
          language: undefined // Auto-detect language
        });

        if (!result.text || result.text.trim() === '') {
          throw new Error('Transcription vide');
        }

        await updateChunkTranscription(chunkId, result.text);
        await refreshChunks();
        toast.success('Transcription terminée');
        return result.text;
      } catch (error) {
        console.error('Failed to transcribe chunk:', error);
        toast.error('Erreur lors de la transcription');
        throw error;
      } finally {
        setIsTranscribing(prev => ({ ...prev, [chunkId]: false }));
      }
    },
    [refreshChunks]
  );

  /**
   * Transcribe a specific chunk in stereo mode (separate left/right channels)
   */
  const transcribeChunkStereo = useCallback(
    async (
      chunkId: string,
      leftSpeaker: 'Praticien' | 'Client' = 'Praticien'
    ): Promise<string> => {
      setIsTranscribing(prev => ({ ...prev, [chunkId]: true }));

      try {
        const chunk = await getAudioChunk(chunkId);
        if (!chunk) {
          throw new Error('Chunk not found');
        }

        if (chunk.transcribed) {
          toast.info('Ce morceau est déjà transcrit');
          return chunk.transcriptText || '';
        }

        console.log('🎤 Transcribing chunk (stereo):', chunkId);
        const result = await transcribeViaBridgeStereo(chunk.blob, {
          language: 'auto'
        });

        // Assign roles based on parameter
        const rightSpeaker: 'Praticien' | 'Client' = leftSpeaker === 'Praticien' ? 'Client' : 'Praticien';
        const stereoTranscript = {
          left: {
            ...result.left,
            speaker: leftSpeaker
          },
          right: {
            ...result.right,
            speaker: rightSpeaker
          }
        };

        // Format: [Speaker] text...\n\n[Speaker] text...
        const combinedText = `[${stereoTranscript.left.speaker}] ${result.left.text}\n\n[${stereoTranscript.right.speaker}] ${result.right.text}`;

        await updateChunkStereoTranscription(chunkId, combinedText, stereoTranscript);
        await refreshChunks();
        toast.success('Transcription stéréo terminée');
        return combinedText;
      } catch (error) {
        console.error('Failed to transcribe chunk (stereo):', error);
        toast.error('Erreur lors de la transcription stéréo');
        throw error;
      } finally {
        setIsTranscribing(prev => ({ ...prev, [chunkId]: false }));
      }
    },
    [refreshChunks]
  );

  /**
   * Transcribe all untranscribed chunks in session
   */
  const transcribeAllChunks = useCallback(
    async (modelId: WhisperModel = 'base'): Promise<void> => {
      const untranscribed = chunks.filter(c => !c.transcribed);

      if (untranscribed.length === 0) {
        toast.info('Tous les morceaux sont déjà transcrits');
        return;
      }

      toast.info(`Transcription de ${untranscribed.length} morceau(x)...`);

      for (const chunk of untranscribed) {
        try {
          await transcribeChunk(chunk.id, modelId);
        } catch (error) {
          console.error(`Failed to transcribe chunk ${chunk.id}:`, error);
          // Continue with next chunk
        }
      }

      toast.success('Transcription terminée pour tous les morceaux');
    },
    [chunks, transcribeChunk]
  );

  /**
   * Delete a chunk
   */
  const removeChunk = useCallback(
    async (chunkId: string): Promise<void> => {
      try {
        await deleteAudioChunk(chunkId);
        await refreshChunks();
        toast.success('Morceau supprimé');
      } catch (error) {
        console.error('Failed to delete chunk:', error);
        toast.error('Erreur lors de la suppression');
        throw error;
      }
    },
    [refreshChunks]
  );

  /**
   * Delete all chunks for current session
   */
  const clearAllChunks = useCallback(async (): Promise<void> => {
    if (!options.sessionId) return;

    try {
      await deleteChunksBySession(options.sessionId);
      await refreshChunks();
      toast.success('Tous les morceaux supprimés');
    } catch (error) {
      console.error('Failed to clear chunks:', error);
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  }, [options.sessionId, refreshChunks]);

  /**
   * Download a chunk as WAV file
   */
  const downloadChunk = useCallback(async (chunkId: string): Promise<void> => {
    try {
      const chunk = await getAudioChunk(chunkId);
      if (!chunk) {
        throw new Error('Chunk not found');
      }

      const url = URL.createObjectURL(chunk.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = chunk.fileName || `audio-chunk-${chunk.timestamp.toISOString()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Téléchargement démarré');
    } catch (error) {
      console.error('Failed to download chunk:', error);
      toast.error('Erreur lors du téléchargement');
    }
  }, []);

  /**
   * Get concatenated transcript of all transcribed chunks
   */
  const getCombinedTranscript = useCallback((): string => {
    return chunks
      .filter(c => c.transcribed && c.transcriptText)
      .map(c => c.transcriptText)
      .join('\n\n');
  }, [chunks]);

  // Auto-refresh on mount and when sessionId changes
  useEffect(() => {
    if (options.autoRefresh !== false) {
      refreshChunks();
    }
  }, [options.autoRefresh, refreshChunks]);

  return {
    chunks,
    isLoading,
    isTranscribing,
    addChunk,
    transcribeChunk,
    transcribeChunkStereo,
    transcribeAllChunks,
    removeChunk,
    clearAllChunks,
    downloadChunk,
    getCombinedTranscript,
    refreshChunks,
  };
};
