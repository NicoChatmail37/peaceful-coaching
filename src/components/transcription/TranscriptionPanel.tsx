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
  AlertCircle
} from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import { transcribeAudio, getModelInfo, WhisperModel } from "@/lib/whisperService";
import { storeAudioBlob, storeTranscriptResult, getTranscriptsBySession, deleteAudioAndTranscripts } from "@/lib/transcriptionStorage";
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<Blob | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentSegments, setCurrentSegments] = useState<any[]>([]);
  const [currentSrt, setCurrentSrt] = useState<string>('');
  const [savedTranscripts, setSavedTranscripts] = useState<any[]>([]);

  const modelInfo = getModelInfo(selectedModel);

  useEffect(() => {
    loadSavedTranscripts();
  }, [sessionId]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Transcription Audio</h3>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Local uniquement
          </Badge>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Modèle Whisper</Label>
          <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as WhisperModel)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiny">
                Tiny ({modelInfo.sizeMB}Mo) - {getModelInfo('tiny').description}
              </SelectItem>
              <SelectItem value="base">
                Base ({getModelInfo('base').sizeMB}Mo) - {getModelInfo('base').description}
              </SelectItem>
              <SelectItem value="small">
                Small ({getModelInfo('small').sizeMB}Mo) - {getModelInfo('small').description}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {modelInfo.description}
          </p>
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