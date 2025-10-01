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
  FileText,
  CheckCircle
} from "lucide-react";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useRealTimeTranscription } from "@/hooks/useRealTimeTranscription";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getModelInfo, type WhisperModel } from "@/lib/whisperService";

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
  const [selectedModel, setSelectedModel] = useState<WhisperModel>('tiny');
  const [vadActivity, setVadActivity] = useState<{ active: boolean; threshold: number; level: number }>({
    active: false,
    threshold: 0.02,
    level: 0
  });
  const [modelCachedStatus, setModelCachedStatus] = useState<Record<WhisperModel, boolean>>({
    'tiny': false,
    'base': false,
    'small': false,
    'medium': false,
  });

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
    currentTranscript,
    flushPendingChunk
  } = useRealTimeTranscription({
    sessionId,
    clientId,
    onTranscriptUpdate,
    stereoMode: enableStereo,
    model: selectedModel
  });

  // Check model cached status on mount and sync with settings
  useEffect(() => {
    const checkModelStatus = async () => {
      const { checkModelAvailability } = await import('@/lib/whisperService');
      const status: Record<WhisperModel, boolean> = {
        'tiny': false,
        'base': false,
        'small': false,
        'medium': false,
      };
      
      for (const model of ['tiny', 'base', 'small', 'medium'] as WhisperModel[]) {
        try {
          const available = await checkModelAvailability(model);
          status[model] = available;
        } catch {
          status[model] = false;
        }
      }
      
      setModelCachedStatus(status);
    };
    
    checkModelStatus();
    
    // Listen for model cache updates from IALocalSettings
    const handleModelCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { model } = customEvent.detail || {};
      if (model) {
        // Re-check the specific model
        import('@/lib/whisperService').then(({ checkModelAvailability }) => {
          checkModelAvailability(model).then((available) => {
            setModelCachedStatus(prev => ({ ...prev, [model]: available }));
          });
        });
      }
    };
    
    window.addEventListener('modelCacheUpdated', handleModelCacheUpdate);
    
    return () => {
      window.removeEventListener('modelCacheUpdated', handleModelCacheUpdate);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // Pre-load the Whisper pipeline before recording starts
    try {
      const { initWhisper } = await import('@/lib/whisperService');
      await initWhisper(selectedModel);
      console.log('✅ Pipeline pre-loaded:', selectedModel);
    } catch (error) {
      console.error('Failed to pre-load pipeline:', error);
      toast({
        title: "Erreur de chargement du modèle",
        description: `Impossible de charger le modèle ${selectedModel}. Vérifiez qu'il est téléchargé.`,
        variant: "destructive"
      });
      return; // Don't start recording if model can't load
    }
    
    startRealTimeTranscription();
    await startRecording(enableStereo, processAudioChunk);
  };

  const handleStop = async () => {
    const audioBlob = await stopRecording();
    stopRealTimeTranscription();
    
    // Flush any pending VAD buffer before finalizing
    await flushPendingChunk();
    
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

        {/* Model selector */}
        <Select 
          value={selectedModel} 
          onValueChange={(value) => setSelectedModel(value as WhisperModel)}
          disabled={disabled || state !== 'idle'}
        >
          <SelectTrigger className="w-[160px] h-8">
            <div className="flex items-center gap-1.5">
              {modelCachedStatus[selectedModel] ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500 fill-green-600/20 dark:fill-green-500/20" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
              )}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(['tiny', 'base', 'small'] as WhisperModel[]).map((model) => {
              const info = getModelInfo(model);
              return (
                <SelectItem key={model} value={model}>
                  <div className="flex items-center gap-2">
                    {modelCachedStatus[model] && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    )}
                    <span className="capitalize">{model}</span>
                    <span className="text-xs text-muted-foreground">
                      {info.sizeMB}MB
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Audio level with VAD indicator */}
        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-75"
                  style={{ width: `${audioLevel * 100}%` }}
                />
                {/* VAD threshold indicator */}
                <div 
                  className="absolute top-0 h-full w-0.5 bg-yellow-400/60"
                  style={{ left: `${vadActivity.threshold * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span>Gain: 2.5x</span>
                {vadActivity.active && (
                  <span className="text-green-500 animate-pulse">● VOIX</span>
                )}
              </div>
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
        <div className="space-y-2">
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
          
          {/* VAD info */}
          <div className="p-2 bg-muted/20 rounded text-xs space-y-1">
            <div className="font-medium">Voice Activity Detection (VAD)</div>
            <div className="text-muted-foreground">
              • Détection automatique des pauses (2.5s)<br/>
              • Gain audio: 2.5x (microphones professionnels)<br/>
              • Compression dynamique pour stabilisation<br/>
              • Seuil adaptatif selon l'environnement
            </div>
          </div>
        </div>
      )}
    </div>
  );
};