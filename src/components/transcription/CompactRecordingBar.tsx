import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Wand2,
  Settings,
  FileText
} from "lucide-react";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useRealTimeTranscription } from "@/hooks/useRealTimeTranscription";
import { toast } from "@/hooks/use-toast";

interface CompactRecordingBarProps {
  onTranscriptUpdate: (text: string) => void;
  onSummaryGenerated: (summary: string) => void;
  disabled?: boolean;
  sessionId: string;
  clientId: string;
}

export const CompactRecordingBar = ({
  onTranscriptUpdate,
  onSummaryGenerated,
  disabled = false,
  sessionId,
  clientId
}: CompactRecordingBarProps) => {
  const [enableStereo, setEnableStereo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const {
    isTranscribing,
    progress,
    processAudioChunk,
    startRealTimeTranscription,
    stopRealTimeTranscription,
    generateContextualSummary,
    isGeneratingSummary,
    currentTranscript
  } = useRealTimeTranscription({
    sessionId,
    clientId,
    onTranscriptUpdate,
    stereoMode: enableStereo
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    startRealTimeTranscription();
    await startRecording(enableStereo, processAudioChunk);
  };

  const handleStop = async () => {
    const audioBlob = await stopRecording();
    stopRealTimeTranscription();
    
    if (audioBlob) {
      toast({
        title: "Enregistrement terminé",
        description: "Transcription finalisée"
      });
    }
  };

  const handleSummary = async () => {
    if (!currentTranscript.trim()) {
      toast({
        title: "Aucune transcription",
        description: "Commencez un enregistrement pour générer un résumé",
        variant: "destructive"
      });
      return;
    }

    const summary = await generateContextualSummary();
    if (summary) {
      onSummaryGenerated(summary);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Mic className="h-4 w-4" />
          Enregistrement non supporté dans ce navigateur
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background border rounded-lg space-y-3">
      {/* Main controls row */}
      <div className="flex items-center gap-3">
        {/* Recording controls */}
        <div className="flex items-center gap-2">
          {state === 'idle' && (
            <Button 
              onClick={handleStart}
              disabled={disabled}
              size="sm"
              className="h-8"
            >
              <Mic className="h-4 w-4 mr-1" />
              REC
            </Button>
          )}
          
          {state === 'recording' && (
            <>
              <Button 
                onClick={pauseRecording}
                variant="secondary"
                size="sm"
                className="h-8"
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button 
                onClick={handleStop}
                variant="destructive"
                size="sm"
                className="h-8"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          )}
          
          {state === 'paused' && (
            <>
              <Button 
                onClick={resumeRecording}
                size="sm"
                className="h-8"
              >
                <Play className="h-4 w-4 mr-1" />
                Reprendre
              </Button>
              <Button 
                onClick={handleStop}
                variant="destructive"
                size="sm"
                className="h-8"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Status and duration */}
        <Badge variant={state === 'recording' ? 'default' : 'secondary'} className="h-6">
          {state === 'recording' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />}
          {formatDuration(duration)}
        </Badge>

        {/* Audio level */}
        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2">
              <Progress value={audioLevel * 100} className="h-2" />
            </div>
          </div>
        )}

        {/* Stereo indicator */}
        {enableStereo && state === 'recording' && (
          <div className="flex items-center gap-1 text-xs">
            <div className="flex flex-col items-center">
              <div className="w-8 h-1 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${stereoInfo.leftLevel * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">T</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-1 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${stereoInfo.rightLevel * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">C</span>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Transcription progress */}
          {isTranscribing && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 animate-pulse" />
              <Progress value={progress} className="w-16 h-2" />
            </div>
          )}

          {/* Summary button */}
          <Button
            onClick={handleSummary}
            disabled={!currentTranscript.trim() || isGeneratingSummary}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            {isGeneratingSummary ? "..." : "Résumé"}
          </Button>

          {/* Settings button */}
          <Button
            onClick={() => setShowSettings(!showSettings)}
            size="sm"
            variant="ghost"
            className="h-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stereo settings (collapsible) */}
      {showSettings && (
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Mode stéréo</span>
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
      )}
    </div>
  );
};