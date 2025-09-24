import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Wand2, 
  FileText, 
  Download, 
  Copy, 
  Trash2,
  Clock,
  Database,
  AlertCircle,
  Zap,
  Wifi,
  WifiOff,
  Brain,
  ListTodo,
  FileTextIcon,
  Sparkles
} from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import { 
  transcribeAudio, 
  getModelInfo, 
  getAvailableModels,
  getBridgeStatus,
  WhisperModel,
  TranscriptionMode,
  BridgeStatus 
} from "@/lib/whisperService";
import { 
  storeAudioBlob, 
  storeTranscriptResult, 
  getTranscriptsBySession, 
  deleteAudioAndTranscripts,
  storeAINote,
  getAINotesByTranscript,
  AINote
} from "@/lib/transcriptionStorage";
import { 
  generateSummary, 
  extractTodos, 
  generateNotes, 
  getLLMBridgeStatus,
  LLMBridgeStatus
} from "@/lib/llmService";
import { toast } from "@/hooks/use-toast";

interface TranscriptionPanelProps {
  sessionId: string;
  clientId: string;
  onTranscriptReady: (text: string) => void;
  disabled?: boolean;
}

export const TranscriptionPanel = ({
  sessionId,
  clientId,
  onTranscriptReady,
  disabled = false
}: TranscriptionPanelProps) => {
  const [selectedModel, setSelectedModel] = useState<WhisperModel>('tiny');
  const [selectedMode, setSelectedMode] = useState<TranscriptionMode>('auto');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<Blob | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentSegments, setCurrentSegments] = useState<any[]>([]);
  const [currentSrt, setCurrentSrt] = useState<string>('');
  const [savedTranscripts, setSavedTranscripts] = useState<any[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [checkingBridge, setCheckingBridge] = useState(false);
  
  // LLM related state
  const [llmBridgeStatus, setLlmBridgeStatus] = useState<LLMBridgeStatus | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [aiStreamContent, setAiStreamContent] = useState<string>('');
  const [currentAINotes, setCurrentAINotes] = useState<AINote[]>([]);
  const [selectedAIType, setSelectedAIType] = useState<'summary' | 'todos' | 'notes'>('summary');

  const modelInfo = getModelInfo(selectedModel);
  const availableModels = getAvailableModels(!!bridgeStatus);

  useEffect(() => {
    loadSavedTranscripts();
    checkBridgeStatus();
    checkLLMBridgeStatus();
  }, [sessionId]);

  useEffect(() => {
    if (currentTranscript) {
      loadAINotes();
    }
  }, [currentTranscript]);

  const checkBridgeStatus = async () => {
    setCheckingBridge(true);
    try {
      const status = await getBridgeStatus();
      setBridgeStatus(status);
    } catch (error) {
      setBridgeStatus(null);
    } finally {
      setCheckingBridge(false);
    }
  };

  const checkLLMBridgeStatus = async () => {
    try {
      const status = await getLLMBridgeStatus();
      setLlmBridgeStatus(status);
    } catch (error) {
      setLlmBridgeStatus(null);
    }
  };

  const loadAINotes = async () => {
    if (!savedTranscripts.length) return;
    
    try {
      // Get AI notes for the current transcript
      const currentSavedTranscript = savedTranscripts.find(t => t.text === currentTranscript);
      if (currentSavedTranscript) {
        const aiNotes = await getAINotesByTranscript(currentSavedTranscript.id);
        setCurrentAINotes(aiNotes);
      }
    } catch (error) {
      console.error('Error loading AI notes:', error);
    }
  };

  const loadSavedTranscripts = async () => {
    try {
      const transcripts = await getTranscriptsBySession(sessionId);
      setSavedTranscripts(transcripts);
    } catch (error) {
      console.error('Error loading saved transcripts:', error);
    }
  };

  const handleAudioReady = async (audioBlob: Blob, source: 'recording' | 'upload') => {
    setCurrentAudio(audioBlob);
    
    toast({
      title: "Audio prêt",
      description: `${source === 'recording' ? 'Enregistrement' : 'Fichier'} audio chargé (${Math.round(audioBlob.size / 1024)} Ko)`
    });
  };

  const handleTranscribe = async () => {
    if (!currentAudio) {
      toast({
        title: "Aucun audio",
        description: "Veuillez enregistrer ou importer un fichier audio",
        variant: "destructive"
      });
      return;
    }

    setIsTranscribing(true);
    setProgress(0);

    try {
      // Store audio in IndexedDB
      const audioId = await storeAudioBlob(currentAudio, sessionId, clientId);
      
      // Transcribe with progress updates
      const result = await transcribeAudio(currentAudio, {
        model: selectedModel,
        language: 'fr',
        mode: selectedMode,
        onProgress: setProgress
      });

      // Store transcript result
      const transcriptId = await storeTranscriptResult({
        audio_id: audioId,
        model: selectedModel,
        lang: 'fr',
        text: result.text,
        segments: result.segments,
        srt: result.srt
      });

      setCurrentTranscript(result.text);
      setCurrentSegments(result.segments);
      setCurrentSrt(result.srt);

      // Reload saved transcripts
      await loadSavedTranscripts();

      toast({
        title: "Transcription terminée",
        description: `${result.segments.length} segments transcrits`
      });

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Erreur de transcription",
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
      setProgress(0);
    }
  };

  const handleUseTranscript = () => {
    if (currentTranscript.trim()) {
      onTranscriptReady(currentTranscript);
      toast({
        title: "Transcript appliqué",
        description: "Le texte a été copié dans la séance"
      });
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Texte copié dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le texte",
        variant: "destructive"
      });
    }
  };

  const handleDownload = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteTranscript = async (transcript: any) => {
    try {
      await deleteAudioAndTranscripts(transcript.audio.id);
      await loadSavedTranscripts();
      toast({
        title: "Supprimé",
        description: "Transcript supprimé de l'historique local"
      });
    } catch (error) {
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le transcript",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateAI = async () => {
    if (!currentTranscript.trim()) {
      toast({
        title: "Aucun transcript",
        description: "Veuillez d'abord transcrire un audio",
        variant: "destructive"
      });
      return;
    }

    if (!llmBridgeStatus?.isConnected) {
      toast({
        title: "LLM non disponible",
        description: "Veuillez démarrer Ollama ou LM Studio",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAI(true);
    setAiResult('');
    setAiStreamContent('');

    try {
      let result = '';
      
      const onProgress = (chunk: string) => {
        setAiStreamContent(prev => prev + chunk);
      };

      if (selectedAIType === 'summary') {
        result = await generateSummary(currentTranscript, { onProgress });
      } else if (selectedAIType === 'todos') {
        result = await extractTodos(currentTranscript, { onProgress });
      } else if (selectedAIType === 'notes') {
        result = await generateNotes(currentTranscript, { onProgress });
      }

      setAiResult(result);

      // Save AI note to IndexedDB
      const currentSavedTranscript = savedTranscripts.find(t => t.text === currentTranscript);
      if (currentSavedTranscript) {
        await storeAINote({
          transcript_id: currentSavedTranscript.id,
          type: selectedAIType,
          prompt: `Generated ${selectedAIType}`,
          result,
          model: 'llama3.1:8b' // Default model fallback
        });
        await loadAINotes();
      }

      toast({
        title: "Analyse terminée",
        description: `${selectedAIType === 'summary' ? 'Résumé' : selectedAIType === 'todos' ? 'Actions' : 'Notes'} générée avec succès`
      });

    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
      setAiStreamContent('');
    }
  };

  const handleUseAIResult = () => {
    if (aiResult.trim()) {
      onTranscriptReady(aiResult);
      toast({
        title: "Analyse appliquée",
        description: "Le résultat d'analyse a été copié dans la séance"
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Transcription Audio</h3>
          <div className="flex items-center gap-2">
            <Badge 
              variant={bridgeStatus ? "default" : "outline"} 
              className="flex items-center gap-1"
            >
              {bridgeStatus ? (
                <>
                  <Zap className="h-3 w-3" />
                  Bridge Pro {bridgeStatus.device.toUpperCase()}
                </>
              ) : (
                <>
                  <Database className="h-3 w-3" />
                  Mode Léger
                </>
              )}
            </Badge>
            <Badge 
              variant={llmBridgeStatus?.isConnected ? "default" : "outline"} 
              className="flex items-center gap-1"
            >
              {llmBridgeStatus?.isConnected ? (
                <>
                  <Brain className="h-3 w-3" />
                  LLM {llmBridgeStatus.backend?.toUpperCase()}
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3 opacity-50" />
                  LLM Off
                </>
              )}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                checkBridgeStatus();
                checkLLMBridgeStatus();
              }}
              disabled={checkingBridge}
              className="h-6 px-2"
            >
              {bridgeStatus ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-2">
            <Label className="text-sm">Mode</Label>
            <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as TranscriptionMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="browser">Navigateur</SelectItem>
                <SelectItem value="bridge" disabled={!bridgeStatus}>
                  Bridge {!bridgeStatus && "(non disponible)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Modèle Whisper</Label>
            <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as WhisperModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => {
                  const info = getModelInfo(model);
                  return (
                    <SelectItem 
                      key={model} 
                      value={model}
                      disabled={info.requiresBridge && !bridgeStatus}
                    >
                      {model.charAt(0).toUpperCase() + model.slice(1)} ({info.sizeMB}Mo)
                      {info.requiresBridge && !bridgeStatus && " - Bridge requis"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>{modelInfo.description}</strong></p>
          {modelInfo.requiresBridge && !bridgeStatus && (
            <p className="text-destructive">⚠️ Ce modèle nécessite le bridge local</p>
          )}
          {bridgeStatus && (
            <p className="text-emerald-600">✓ Bridge connecté - GPU {bridgeStatus.device.toUpperCase()} disponible</p>
          )}
          {llmBridgeStatus?.isConnected && (
            <p className="text-blue-600">✓ LLM Local connecté ({llmBridgeStatus.backend}) - Analyse IA disponible</p>
          )}
          <p className="text-muted-foreground">🔒 Tout reste local — aucune donnée n'est envoyée au cloud</p>
        </div>
      </div>

      <div className="flex-1">
        <Tabs defaultValue="record" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="record">Enregistrer</TabsTrigger>
            <TabsTrigger value="transcript">Résultat</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="flex-1 px-4 pb-4">
            <div className="space-y-4">
              <AudioRecorder
                onAudioReady={handleAudioReady}
                disabled={disabled || isTranscribing}
              />

              {currentAudio && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Audio prêt ({Math.round(currentAudio.size / 1024)} Ko)
                    </span>
                    <Button
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="flex items-center gap-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      {isTranscribing ? 'Transcription...' : 'Transcrire'}
                    </Button>
                  </div>

                  {isTranscribing && (
                    <div className="mt-3 space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        Transcription en cours... {Math.round(progress)}%
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcript" className="flex-1 px-4 pb-4">
            {currentTranscript ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Texte transcrit
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(currentTranscript)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(currentTranscript, 'transcript.txt')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Textarea
                    value={currentTranscript}
                    onChange={(e) => setCurrentTranscript(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="Le texte transcrit apparaîtra ici..."
                  />
                  
                  <Button
                    onClick={handleUseTranscript}
                    className="mt-3 w-full"
                    disabled={!currentTranscript.trim()}
                  >
                    Utiliser dans la séance
                  </Button>
                </Card>

                {/* IA Locale Section */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      IA Locale
                    </Label>
                    <Badge variant={llmBridgeStatus?.isConnected ? "default" : "secondary"}>
                      {llmBridgeStatus?.isConnected ? "Connecté ✓" : "Non disponible"}
                    </Badge>
                  </div>

                  {llmBridgeStatus?.isConnected ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant={selectedAIType === 'summary' ? "default" : "outline"}
                          onClick={() => setSelectedAIType('summary')}
                          className="flex items-center gap-1"
                        >
                          <FileTextIcon className="h-3 w-3" />
                          Résumé
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAIType === 'todos' ? "default" : "outline"}
                          onClick={() => setSelectedAIType('todos')}
                          className="flex items-center gap-1"
                        >
                          <ListTodo className="h-3 w-3" />
                          Actions
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAIType === 'notes' ? "default" : "outline"}
                          onClick={() => setSelectedAIType('notes')}
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          Notes
                        </Button>
                      </div>

                      <Button
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI || !currentTranscript.trim()}
                        className="w-full"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {isGeneratingAI ? 'Analyse en cours...' : `Générer ${selectedAIType === 'summary' ? 'Résumé' : selectedAIType === 'todos' ? 'Actions' : 'Notes'}`}
                      </Button>

                      {(isGeneratingAI && aiStreamContent) && (
                        <Card className="p-3 bg-muted/50">
                          <div className="text-sm whitespace-pre-wrap">{aiStreamContent}</div>
                        </Card>
                      )}

                      {aiResult && (
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">
                              {selectedAIType === 'summary' ? 'Résumé' : selectedAIType === 'todos' ? 'Actions/TODO' : 'Notes structurées'}
                            </Label>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyToClipboard(aiResult)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(aiResult, `${selectedAIType}.txt`)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {aiResult}
                          </div>
                          <Button
                            onClick={handleUseAIResult}
                            className="mt-2 w-full"
                            size="sm"
                          >
                            Utiliser cette analyse dans la séance
                          </Button>
                        </Card>
                      )}

                      {currentAINotes.length > 0 && (
                        <Card className="p-4">
                          <Label className="text-sm font-medium mb-2 block">Analyses précédentes</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {currentAINotes.map((note) => (
                              <div key={note.id} className="text-xs p-2 bg-muted/30 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {note.type}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {new Date(note.created_at).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                <p className="line-clamp-2">{note.result}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <Brain className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Bridge LLM non détecté</p>
                      <p className="text-xs">Démarrez Ollama ou LM Studio pour activer l'IA locale</p>
                    </div>
                  )}
                </Card>

                {currentSegments.length > 0 && (
                  <Card className="p-4">
                    <Label className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4" />
                      Segments avec timestamps
                    </Label>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {currentSegments.map((segment, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-muted-foreground font-mono">
                              {formatDuration(segment.t0)}-{formatDuration(segment.t1)}:
                            </span>
                            <span className="ml-2">{segment.text}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => handleDownload(currentSrt, 'transcript.srt')}
                    >
                      Télécharger SRT
                    </Button>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun transcript disponible</p>
                  <p className="text-sm">Enregistrez ou importez un audio puis transcrivez-le</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 px-4 pb-4">
            <ScrollArea className="h-full">
              {savedTranscripts.length > 0 ? (
                <div className="space-y-3">
                  {savedTranscripts.map((transcript) => (
                    <Card key={transcript.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {transcript.model}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(transcript.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-3">
                            {transcript.text}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentTranscript(transcript.text);
                              setCurrentSegments(transcript.segments);
                              setCurrentSrt(transcript.srt);
                            }}
                          >
                            Charger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTranscript(transcript)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2" />
                    <p>Aucun transcript sauvegardé</p>
                    <p className="text-sm">Les transcriptions seront automatiquement sauvegardées localement</p>
                  </div>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};