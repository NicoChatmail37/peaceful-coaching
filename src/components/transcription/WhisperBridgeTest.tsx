import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, XCircle, Loader2, FileAudio, Radio } from 'lucide-react';
import { pingBridge, transcribeViaBridge, type BridgeStatus, type TranscriptionResult } from '@/services/bridgeClient';
import { BRIDGE_URL } from '@/config/bridge';
import { toast } from 'sonner';

export const WhisperBridgeTest = () => {
  const [useBridge, setUseBridge] = useState(true);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [task, setTask] = useState<"transcribe" | "translate">("transcribe");
  const [language, setLanguage] = useState<"auto" | "fr" | "en">("auto");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check bridge status when enabled
  useEffect(() => {
    if (!useBridge) {
      setBridgeStatus(null);
      setBridgeError(null);
      return;
    }

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort("timeout"), 1500);
    
    setIsCheckingStatus(true);
    setBridgeError(null);
    
    pingBridge(ac.signal)
      .then((status) => {
        setBridgeStatus(status);
        toast.success('Bridge connecté avec succès');
      })
      .catch((error) => {
        const errorMsg = error.message || 'Erreur de connexion';
        setBridgeError(errorMsg);
        setBridgeStatus(null);
        toast.error('Bridge non disponible');
      })
      .finally(() => {
        setIsCheckingStatus(false);
        clearTimeout(timeout);
      });

    return () => {
      ac.abort();
      clearTimeout(timeout);
    };
  }, [useBridge]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTranscriptionResult(null);
      setTranscriptionError(null);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }

    if (!bridgeStatus?.ok) {
      toast.error('Le bridge n\'est pas connecté');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);
    setTranscriptionResult(null);

    try {
      const result = await transcribeViaBridge(selectedFile, {
        task,
        language: language === "auto" ? undefined : language
      });
      setTranscriptionResult(result);
      toast.success('Transcription terminée');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur de transcription';
      setTranscriptionError(errorMsg);
      toast.error('Échec de la transcription');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Bridge Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Configuration du Bridge Local
          </CardTitle>
          <CardDescription>
            Whisper Bridge sur {BRIDGE_URL}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-bridge"
              checked={useBridge}
              onCheckedChange={setUseBridge}
            />
            <Label htmlFor="use-bridge">
              Utiliser le bridge local (http://127.0.0.1:27123)
            </Label>
          </div>

          {!useBridge ? (
            <div className="text-sm text-muted-foreground">
              Bridge désactivé.
            </div>
          ) : isCheckingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification du statut...
            </div>
          ) : bridgeError ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                ❌ Bridge non disponible — {bridgeError}
              </AlertDescription>
            </Alert>
          ) : bridgeStatus?.ok ? (
            <div className="space-y-2">
              <Badge variant="default" className="bg-green-600">
                ✅ Bridge OK
              </Badge>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Modèle: <span className="font-mono">{bridgeStatus.model}</span></p>
                <p>Device: <span className="font-mono">{bridgeStatus.device}</span></p>
                {bridgeStatus.compute_type && (
                  <p>Compute: <span className="font-mono">{bridgeStatus.compute_type}</span></p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Transcription Test */}
      <Card>
        <CardHeader>
          <CardTitle>Test de transcription</CardTitle>
          <CardDescription>
            Téléchargez un fichier audio pour tester la transcription via le bridge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task and Language Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task">Mode</Label>
              <Select
                value={task}
                onValueChange={(value) => setTask(value as "transcribe" | "translate")}
                disabled={!useBridge || !bridgeStatus?.ok}
              >
                <SelectTrigger id="task">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transcribe">Transcribe (garder la langue)</SelectItem>
                  <SelectItem value="translate">Translate → anglais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Langue</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as "auto" | "fr" | "en")}
                disabled={!useBridge || !bridgeStatus?.ok}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-détection</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              disabled={!useBridge || !bridgeStatus?.ok}
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner un fichier audio
            </Button>
            
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileAudio className="h-4 w-4" />
                <span className="truncate">{selectedFile.name}</span>
                <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Transcribe Button */}
          <Button
            onClick={handleTranscribe}
            disabled={!selectedFile || !useBridge || !bridgeStatus?.ok || isTranscribing}
            className="w-full"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transcription en cours...
              </>
            ) : (
              'Transcrire via Bridge'
            )}
          </Button>

          {/* Transcription Error */}
          {transcriptionError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                {transcriptionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Transcription Results */}
          {transcriptionResult && (
            <div className="space-y-4">
              <Separator />
              
              {/* Text Result */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Texte transcrit:</label>
                  {transcriptionResult.duration && (
                    <Badge variant="secondary">
                      {transcriptionResult.duration.toFixed(1)}s
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={transcriptionResult.text}
                  readOnly
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>

              {/* Segments */}
              {transcriptionResult.segments && transcriptionResult.segments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Segments ({transcriptionResult.segments.length}):
                  </label>
                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-3 space-y-2">
                      {transcriptionResult.segments.map((segment, idx) => (
                        <div key={idx} className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-mono">
                              {formatTime(segment.start)} → {formatTime(segment.end)}
                            </Badge>
                          </div>
                          <p className="pl-2 border-l-2 border-muted">
                            {segment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
