import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, FileText, Download, Trash2, MoreVertical, Upload, CheckCircle, Clock } from "lucide-react";
import { useAudioChunks } from "@/hooks/useAudioChunks";
import { toast } from "@/hooks/use-toast";
import type { WhisperModel } from "@/lib/whisperService";

interface AudioChunksHorizontalBandProps {
  sessionId: string;
  clientId: string;
  whisperModel?: WhisperModel;
  onChunkTranscribed?: (chunkId: string, text: string, timestamp: Date) => void;
}

export const AudioChunksHorizontalBand = ({
  sessionId,
  clientId,
  whisperModel = 'base',
  onChunkTranscribed,
}: AudioChunksHorizontalBandProps) => {
  const {
    chunks,
    isTranscribing,
    transcribeChunk,
    removeChunk,
    downloadChunk,
    addChunk,
  } = useAudioChunks({ sessionId, clientId, autoRefresh: true });

  const [playingChunk, setPlayingChunk] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayChunk = async (chunkId: string) => {
    const chunk = chunks.find(c => c.id === chunkId);
    if (!chunk) return;

    if (playingChunk === chunkId) {
      audioRef.current?.pause();
      setPlayingChunk(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = URL.createObjectURL(chunk.blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingChunk(null);
      URL.revokeObjectURL(url);
    };

    audio.play();
    setPlayingChunk(chunkId);
  };

  const handleTranscribe = async (chunkId: string) => {
    try {
      await transcribeChunk(chunkId, whisperModel);
      
      // Emit event for parent component
      const chunk = chunks.find(c => c.id === chunkId);
      if (chunk?.transcriptText && onChunkTranscribed) {
        onChunkTranscribed(chunkId, chunk.transcriptText, chunk.timestamp);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert to WAV if needed
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const wavBlob = await encodeToWAV(audioBuffer);
      const duration = audioBuffer.duration;
      
      await addChunk(wavBlob, duration, 'uploaded', file.name);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'import",
        description: "Impossible de traiter le fichier audio",
        variant: "destructive"
      });
    }
  };

  const encodeToWAV = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = 1; // Mono
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const samples = audioBuffer.getChannelData(0);
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bitDepth / 8, true);
    view.setUint16(32, numberOfChannels * bitDepth / 8, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  if (chunks.length === 0) {
    return (
      <div className="p-3 bg-muted/20 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Aucun morceau audio. Enregistrez ou importez des fichiers.
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-1" />
            Importer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-muted/20">
      <ScrollArea className="w-full">
        <div className="flex gap-2 p-3">
          {chunks.map((chunk, index) => (
            <Card 
              key={chunk.id} 
              className="flex-shrink-0 w-48 p-3 space-y-2 bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Morceau {index + 1}
                </span>
                <Badge 
                  variant={chunk.transcribed ? "default" : "secondary"}
                  className="h-5 text-xs"
                >
                  {chunk.transcribed ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Transcrit
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      À transcrire
                    </>
                  )}
                </Badge>
              </div>

              <div className="text-sm font-medium">
                {formatDuration(chunk.duration)}
              </div>

              {chunk.transcribed && chunk.transcriptText && (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {chunk.transcriptText}
                </div>
              )}

              <div className="flex items-center gap-1 pt-1">
                {!chunk.transcribed && (
                  <Button
                    onClick={() => handleTranscribe(chunk.id)}
                    disabled={isTranscribing[chunk.id]}
                    size="sm"
                    variant="default"
                    className="h-7 flex-1 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {isTranscribing[chunk.id] ? "..." : "Transcrire"}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePlayChunk(chunk.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      {playingChunk === chunk.id ? "Pause" : "Écouter"}
                    </DropdownMenuItem>
                    {!chunk.transcribed && (
                      <DropdownMenuItem 
                        onClick={() => handleTranscribe(chunk.id)}
                        disabled={isTranscribing[chunk.id]}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Transcrire
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => downloadChunk(chunk.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => removeChunk(chunk.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}

          {/* Import button at the end */}
          <div className="flex-shrink-0 w-48 flex items-center justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="h-full"
            >
              <Upload className="h-4 w-4 mr-1" />
              Importer
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
