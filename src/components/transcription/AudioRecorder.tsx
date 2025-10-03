import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Upload,
  AlertCircle,
  Headphones
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
    stereoInfo,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isSupported,
  } = useAudioRecording();

  const [dragOver, setDragOver] = useState(false);
  const [enableStereo, setEnableStereo] = useState(false);

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
          {/* Stereo Configuration */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              <div className="flex flex-col">
                <Label className="text-sm">Mode stéréo (RØDE Wireless Go II)</Label>
                <span className="text-xs text-muted-foreground">
                  Dialogue thérapeutique séparé par canal
                </span>
              </div>
            </div>
            <Switch
              checked={enableStereo}
              onCheckedChange={setEnableStereo}
              disabled={disabled || state !== 'idle'}
            />
          </div>

          {/* Stereo Status Indicators */}
          {enableStereo && (
            <div className="flex items-center gap-4 p-3 bg-background border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium">Canal L</span>
                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${stereoInfo.leftLevel * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Thérapeute</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium">Canal R</span>
                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${stereoInfo.rightLevel * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Client</span>
                </div>
              </div>

              <div className="flex flex-col text-xs text-muted-foreground">
                <span>Canaux: {stereoInfo.channelCount}</span>
                <span className={stereoInfo.webGpuAvailable ? "text-green-600" : "text-orange-600"}>
                  {stereoInfo.webGpuAvailable ? "WebGPU OK" : "CPU mode"}
                </span>
                <span className={stereoInfo.browserOptimal ? "text-green-600" : "text-orange-600"}>
                  {stereoInfo.browserOptimal ? "Chrome/Edge" : "Autre navigateur"}
                </span>
              </div>
            </div>
          )}

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
                onClick={() => startRecording({ enableStereo })} 
                disabled={disabled}
                size="sm"
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Démarrer {enableStereo ? 'Stéréo' : ''}
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