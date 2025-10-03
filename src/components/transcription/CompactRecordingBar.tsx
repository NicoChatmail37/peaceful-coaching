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
  Package,
  Target,
  Globe
} from "lucide-react";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useRealTimeTranscription } from "@/hooks/useRealTimeTranscription";
import { useAudioChunks } from "@/hooks/useAudioChunks";
import { toast } from "@/hooks/use-toast";
import type { RecordingMode } from "@/lib/audioWorkletRecorder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { getModelInfo, type WhisperModel } from "@/lib/whisperService";
import { AudioChunksPanel } from "@/components/transcription/AudioChunksPanel";

interface CompactRecordingBarProps {
  onTranscriptUpdate: (text: string) => void;
  onSummaryGenerated: (summary: string) => void;
  disabled?: boolean;
  sessionId: string;
  clientId: string;
  clientName?: string;
}

export const CompactRecordingBar = ({
  onTranscriptUpdate,
  onSummaryGenerated,
  disabled = false,
  sessionId,
  clientId,
  clientName = 'Client'
}: CompactRecordingBarProps) => {
  const [enableStereo, setEnableStereo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<WhisperModel>('tiny');
  const [modelSource, setModelSource] = useState<'browser' | 'bridge'>('browser');
  const [bridgeDevice, setBridgeDevice] = useState<string>('');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('auto-60s');
  const [showChunksPanel, setShowChunksPanel] = useState(false);
  const [vadActivity, setVadActivity] = useState<{ active: boolean; threshold: number; level: number }>({
    active: false,
    threshold: 0.02,
    level: 0
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
    markChunk,
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
    stereoMode: false, // Force mono after RMS downmix
    model: selectedModel
  });

  const { 
    chunks, 
    addChunk, 
    refreshChunks 
  } = useAudioChunks({ 
    sessionId, 
    clientId, 
    autoRefresh: true 
  });

  // Load preferred model from settings on mount
  useEffect(() => {
    const loadPreferredModel = async () => {
      const { getPreferredWhisperModel } = await import('@/lib/envProbe');
      const { probeEnvironment } = await import('@/lib/envProbe');
      
      const preferred = await getPreferredWhisperModel();
      const env = await probeEnvironment();
      
      setSelectedModel(preferred as WhisperModel);
      
      // Determine if bridge or browser
      if (env.bridge.available && env.bridge.models.includes(preferred)) {
        setModelSource('bridge');
        setBridgeDevice(env.bridge.device);
      } else {
        setModelSource('browser');
      }
    };
    
    loadPreferredModel();
    
    // Listen for preferred model changes
    const handlePreferredModelChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { model } = customEvent.detail || {};
      if (model) {
        loadPreferredModel();
      }
    };
    
    window.addEventListener('preferredModelChanged', handlePreferredModelChange);
    
    return () => {
      window.removeEventListener('preferredModelChanged', handlePreferredModelChange);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const { initWhisper } = await import('@/lib/whisperService');
      await initWhisper(selectedModel);
    } catch (error) {
      console.error('Failed to pre-load pipeline:', error);
      toast({
        title: "Erreur de chargement du modèle",
        description: `Impossible de charger le modèle ${selectedModel}. Vérifiez qu'il est téléchargé.`,
        variant: "destructive"
      });
      return;
    }
    
    startRealTimeTranscription();
    await startRecording({ 
      enableStereo, 
      onAudioChunk: processAudioChunk,
      mode: recordingMode,
      onChunkReady: async (blob, duration) => {
        await addChunk(blob, duration, 'recorded');
      }
    });
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

        {/* Model indicator badge */}
        <Badge variant="outline" className="h-6 gap-1.5">
          <Target className="h-3 w-3" />
          <span className="capitalize">{selectedModel}</span>
          {modelSource === 'bridge' ? (
            <span className="text-xs text-muted-foreground">({bridgeDevice})</span>
          ) : (
            <span className="text-xs text-muted-foreground">(Navigateur)</span>
          )}
        </Badge>

        {/* Language indicator badge */}
        <Badge variant="outline" className="h-6 gap-1.5">
          <Globe className="h-3 w-3" />
          FR
        </Badge>

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
                <span>Gain: 1.5x</span>
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

          {/* Audio chunks button */}
          <Sheet open={showChunksPanel} onOpenChange={setShowChunksPanel}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Package className="h-4 w-4 mr-1" />
                Morceaux ({chunks.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Morceaux audio - {clientName}</SheetTitle>
                <SheetDescription>
                  Gérez et transcrivez vos enregistrements audio par morceaux
                </SheetDescription>
              </SheetHeader>
              <AudioChunksPanel 
                sessionId={sessionId} 
                clientId={clientId}
                clientName={clientName}
                whisperModel={selectedModel}
              />
            </SheetContent>
          </Sheet>

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
              • Gain audio: 1.5x (microphones professionnels)<br/>
              • Compression dynamique pour stabilisation<br/>
              • Seuil adaptatif selon l'environnement
            </div>
          </div>
        </div>
      )}
    </div>
  );
};