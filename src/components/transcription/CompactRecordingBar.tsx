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
import { getModelInfo, type WhisperModel } from "@/lib/whisperService";

interface CompactRecordingBarProps {
  onTranscriptUpdate: (text: string) => void;
  onSummaryGenerated: (summary: string) => void;
  disabled?: boolean;
  sessionId: string;
  clientId: string;
  clientName?: string;
  onStereoChange?: (enabled: boolean) => void;
}

export const CompactRecordingBar = ({
  onTranscriptUpdate,
  onSummaryGenerated,
  disabled = false,
  sessionId,
  clientId,
  clientName = 'Client',
  onStereoChange,
}: CompactRecordingBarProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<WhisperModel>('tiny');
  const [modelSource, setModelSource] = useState<'browser' | 'bridge'>('browser');
  const [bridgeDevice, setBridgeDevice] = useState<string>('');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('auto-60s');
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
    // Ne charger le pipeline que si on utilise le navigateur
    if (modelSource === 'browser') {
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
    } else {
      console.log('🔗 Utilisation du bridge, pas d\'initialisation locale');
    }
    
    startRealTimeTranscription();
    await startRecording({ 
      enableStereo: false, // Always mono with WhisperX diarization
      onAudioChunk: processAudioChunk,
      mode: recordingMode,
      autoChunkDuration: 150, // 2min30 chunks for auto-transcription workflow
      onChunkReady: async (blob, duration) => {
        // 1. Store chunk in IndexedDB
        const chunkId = await addChunk(blob, duration, 'recorded');
        
        console.log(`📼 Chunk ${chunkId} enregistré (${Math.round(duration)}s)`);
        
        toast({
          title: "Segment enregistré",
          description: `Nouveau segment de ${Math.round(duration)}s prêt à transcrire`
        });
        
        // 2. Refresh chunks display (transcription via bouton)
        await refreshChunks();
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

      {/* Settings (collapsible) */}
      {showSettings && (
        <div className="space-y-2">
          {/* Diarization info */}
          <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
            <div className="font-medium">WhisperX avec Diarisation</div>
            <div className="text-muted-foreground">
              • Identification automatique des locuteurs via WhisperX<br/>
              • Séparation Thérapeute (SPEAKER_00) / Client (SPEAKER_01)<br/>
              • Plus besoin d'enregistrement stéréo
            </div>
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