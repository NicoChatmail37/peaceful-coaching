import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Upload,
  AlertCircle
} from "lucide-react";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, source: 'recording' | 'upload') => void;
  disabled?: boolean;
}

export const AudioRecorder = ({ onAudioReady, disabled = false }: AudioRecorderProps) => {
  const {
    state,
    duration,
    audioLevel,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isSupported,
  } = useAudioRecording();

  const [dragOver, setDragOver] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
      onAudioReady(audioBlob, 'recording');
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('audio/')) {
      alert('Veuillez sélectionner un fichier audio valide');
      return;
    }

    onAudioReady(file, 'upload');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            L'enregistrement audio n'est pas supporté dans ce navigateur
          </span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={state === 'recording' ? 'default' : 'secondary'}>
                {state === 'recording' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />}
                {state === 'idle' && 'Prêt'}
                {state === 'recording' && 'REC'}
                {state === 'paused' && 'PAUSE'}
                {state === 'processing' && 'Traitement...'}
              </Badge>
              <span className="text-sm font-mono">{formatDuration(duration)}</span>
            </div>
            
            {state === 'recording' && (
              <div className="flex items-center gap-2">
                <div className="w-16">
                  <Progress value={audioLevel * 100} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground">VU</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {state === 'idle' && (
              <Button 
                onClick={startRecording} 
                disabled={disabled}
                size="sm"
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Démarrer
              </Button>
            )}
            
            {state === 'recording' && (
              <>
                <Button 
                  onClick={pauseRecording} 
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button 
                  onClick={handleStop} 
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
            
            {state === 'paused' && (
              <>
                <Button 
                  onClick={resumeRecording} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Reprendre
                </Button>
                <Button 
                  onClick={handleStop} 
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* File Upload */}
      <Card 
        className={`p-4 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer un fichier audio
          </Label>
          
          <Input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={disabled || state !== 'idle'}
          />
          
          <p className="text-xs text-muted-foreground">
            Formats supportés: MP3, WAV, WebM, M4A (max 100 Mo)
          </p>
        </div>
      </Card>
    </div>
  );
};