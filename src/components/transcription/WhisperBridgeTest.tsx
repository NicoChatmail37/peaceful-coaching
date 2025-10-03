import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Upload, CheckCircle, XCircle, Loader2, FileAudio } from 'lucide-react';
import { 
  getBridgeStatus, 
  transcribeBridge, 
  type BridgeStatus,
  type WhisperResult
} from '@/lib/whisperService';
import { toast } from 'sonner';

export const WhisperBridgeTest = () => {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<WhisperResult | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check bridge status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsCheckingStatus(true);
      setBridgeError(null);
      
      try {
        const status = await getBridgeStatus();
        setBridgeStatus(status);
        toast.success('Bridge connecté avec succès');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur de connexion';
        setBridgeError(errorMsg);
        toast.error('Bridge non disponible');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

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
      const result = await transcribeBridge(selectedFile, 'small', 'fr');
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
      {/* Bridge Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isCheckingStatus ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : bridgeStatus?.ok ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Whisper Bridge Local
          </CardTitle>
          <CardDescription>
            Test de connexion au bridge local (http://127.0.0.1:27123)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCheckingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification du statut...
            </div>
          ) : bridgeStatus?.ok ? (
            <div className="space-y-2">
              <Badge variant="default" className="bg-green-600">
                ✅ Bridge connecté
              </Badge>
              {bridgeStatus.device && (
                <p className="text-sm text-muted-foreground">
                  Device: <span className="font-mono">{bridgeStatus.device}</span>
                </p>
              )}
              {bridgeStatus.models && bridgeStatus.models.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Modèles disponibles:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {bridgeStatus.models.map((model, idx) => (
                      <li key={idx} className="font-mono">
                        • {model.name}
                        {model.sizeMB && ` (${model.sizeMB}MB)`}
                        {model.quant && ` - ${model.quant}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                ❌ Bridge non disponible
                {bridgeError && (
                  <div className="mt-2 text-xs font-mono">{bridgeError}</div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Transcription Test Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test de transcription</CardTitle>
          <CardDescription>
            Téléchargez un fichier audio pour tester la transcription via le bridge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              disabled={!bridgeStatus?.ok}
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
            disabled={!selectedFile || !bridgeStatus?.ok || isTranscribing}
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
                <label className="text-sm font-medium">Texte transcrit:</label>
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
                              {formatTime(segment.t0)} → {formatTime(segment.t1)}
                            </Badge>
                            {segment.conf !== undefined && (
                              <span className="text-xs">
                                {(segment.conf * 100).toFixed(0)}%
                              </span>
                            )}
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
