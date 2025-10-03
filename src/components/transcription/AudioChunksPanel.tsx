import { useState, useRef } from 'react';
import { useAudioChunks } from '@/hooks/useAudioChunks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Music,
  Download,
  FileText,
  Trash2,
  Upload,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  FileAudio,
  Play,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { WhisperModel } from "@/lib/whisperService";

interface AudioChunksPanelProps {
  sessionId?: string;
  clientId?: string;
  clientName?: string;
  whisperModel?: WhisperModel;
}

export const AudioChunksPanel = ({
  sessionId,
  clientId,
  clientName = 'Client',
  whisperModel = 'base',
}: AudioChunksPanelProps) => {
  const {
    chunks,
    isLoading,
    isTranscribing,
    transcribeChunk,
    transcribeAllChunks,
    removeChunk,
    clearAllChunks,
    downloadChunk,
    getCombinedTranscript,
  } = useAudioChunks({ sessionId, clientId, autoRefresh: true });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chunkToDelete, setChunkToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [playingChunk, setPlayingChunk] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm:ss', { locale: fr });
  };

  const handlePlayChunk = async (chunkId: string, blob: Blob) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingChunk === chunkId) {
      setPlayingChunk(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingChunk(chunkId);

    audio.onended = () => {
      setPlayingChunk(null);
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };

    try {
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      toast.error('Erreur lors de la lecture');
      setPlayingChunk(null);
    }
  };

  const handleDeleteClick = (chunkId: string) => {
    setChunkToDelete(chunkId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chunkToDelete) return;
    await removeChunk(chunkToDelete);
    setDeleteDialogOpen(false);
    setChunkToDelete(null);
  };

  const { addChunk } = useAudioChunks({ sessionId, clientId });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
          toast.error(`${file.name} n'est pas un fichier audio`);
          continue;
        }

        // Convert to WAV 16kHz mono if needed
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get mono channel
        const monoChannel = audioBuffer.getChannelData(0);

        // Encode to WAV
        const wavBlob = await encodeToWAV(monoChannel, 16000);
        const duration = audioBuffer.duration;

        // Store chunk
        await addChunk(wavBlob, duration, 'uploaded', file.name);

        toast.success(`${file.name} importé (${Math.round(duration)}s)`);
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.error(`Erreur lors de l'import de ${file.name}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const encodeToWAV = async (samples: Float32Array, sampleRate: number): Promise<Blob> => {
    // Convert Float32 to Int16
    const int16Data = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Create WAV header
    const buffer = new ArrayBuffer(44 + int16Data.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.length * 2, true);

    // Write PCM data
    const dataView = new DataView(buffer, 44);
    for (let i = 0; i < int16Data.length; i++) {
      dataView.setInt16(i * 2, int16Data[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleCopyTranscript = () => {
    const transcript = getCombinedTranscript();
    if (!transcript) {
      toast.info('Aucune transcription disponible');
      return;
    }

    navigator.clipboard.writeText(transcript);
    toast.success('Transcription copiée');
  };

  const untranscribedCount = chunks.filter(c => !c.transcribed).length;
  const totalDuration = chunks.reduce((acc, c) => acc + c.duration, 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Morceaux audio
              {clientName && <span className="text-sm text-muted-foreground">— {clientName}</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {chunks.length} morceau(x) · {formatDuration(totalDuration)}
              {untranscribedCount > 0 && ` · ${untranscribedCount} non transcrit(s)`}
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
            {untranscribedCount > 0 && (
              <Button
                size="sm"
                onClick={() => transcribeAllChunks(whisperModel)}
                disabled={Object.values(isTranscribing).some(Boolean)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Transcrire tout
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun morceau enregistré</p>
              <p className="text-sm text-muted-foreground mt-1">
                Commencez un enregistrement ou importez un fichier audio
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {chunks.map((chunk, index) => (
                <Card key={chunk.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {chunk.source === 'uploaded' && chunk.fileName
                              ? chunk.fileName
                              : `Morceau ${index + 1}`}
                          </span>
                          {chunk.source === 'uploaded' && (
                            <Badge variant="outline" className="shrink-0">Importé</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatDuration(chunk.duration)}</span>
                          <span>·</span>
                          <span>{formatTime(chunk.timestamp)}</span>
                        </div>
                        {chunk.transcribed ? (
                          <div className="mt-2 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-sm line-clamp-2">{chunk.transcriptText}</p>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Non transcrit</span>
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePlayChunk(chunk.id, chunk.blob)}
                          >
                            <Music className="h-4 w-4 mr-2" />
                            {playingChunk === chunk.id ? 'Arrêter' : 'Écouter'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadChunk(chunk.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </DropdownMenuItem>
                          {!chunk.transcribed && (
                            <DropdownMenuItem
                              onClick={() => transcribeChunk(chunk.id, whisperModel)}
                              disabled={isTranscribing[chunk.id]}
                            >
                              {isTranscribing[chunk.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              Transcrire
                            </DropdownMenuItem>
                          )}
                          <Separator className="my-1" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(chunk.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {chunks.length > 0 && (
          <>
            <Separator />
            <div className="p-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyTranscript}
                disabled={!chunks.some(c => c.transcribed)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Copier transcription
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearAllDialogOpen(true)}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Tout supprimer
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce morceau ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier audio et sa transcription seront
              définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les morceaux ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les morceaux audio ({chunks.length}) et leurs transcriptions seront
              définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await clearAllChunks();
                setClearAllDialogOpen(false);
              }}
            >
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
