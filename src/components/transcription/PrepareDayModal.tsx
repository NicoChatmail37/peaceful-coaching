import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  Battery, 
  Monitor, 
  Laptop, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  Download,
  Settings,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { WhisperModel } from '@/lib/whisperService';
import type { EnvironmentProbe } from '@/lib/envProbe';
import { 
  recommendModel, 
  getAvailableModelsWithRecommendation,
  getContextualAdvice 
} from '@/lib/modelRecommendation';

interface PrepareDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: EnvironmentProbe | null;
  onPrepareModel: (model: WhisperModel | 'auto') => Promise<void>;
  onSkip: () => void;
  onNeverShow: () => void;
}

export const PrepareDayModal = ({
  open,
  onOpenChange,
  environment,
  onPrepareModel,
  onSkip,
  onNeverShow
}: PrepareDayModalProps) => {
  const [selectedModel, setSelectedModel] = useState<WhisperModel | 'auto'>('auto');
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState(0);

  const models = environment ? getAvailableModelsWithRecommendation(environment) : null;
  const recommendation = environment ? recommendModel(environment) : null;
  const advice = environment && selectedModel !== 'auto' 
    ? getContextualAdvice(environment, selectedModel as WhisperModel)
    : recommendation?.reason || '';

  // Auto-select recommended model when environment changes
  useEffect(() => {
    if (models?.recommended && selectedModel === 'auto') {
      // Keep auto selected, but show what it means
    }
  }, [models?.recommended]);

  const handlePrepare = async () => {
    setPreparing(true);
    try {
      await onPrepareModel(selectedModel);
      toast({
        title: "Modèle préparé",
        description: "Le modèle est prêt à être utilisé",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erreur de préparation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setPreparing(false);
    }
  };

  const getDeviceIcon = () => {
    if (!environment) return <Monitor className="h-4 w-4" />;
    switch (environment.device.class) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'laptop': return <Laptop className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getPowerIcon = () => {
    if (!environment) return <Zap className="h-4 w-4" />;
    return environment.device.powerState === 'battery' 
      ? <Battery className="h-4 w-4" />
      : <Zap className="h-4 w-4" />;
  };

  if (!environment || !models) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chargement...</DialogTitle>
            <DialogDescription>
              Détection de l'environnement en cours...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasAnyModelCached = Object.values(environment.cached).some(Boolean);
  const actualSelectedModel = selectedModel === 'auto' ? models.recommended : selectedModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Préparer la journée
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Configuration automatique de la transcription locale selon votre environnement
          </DialogDescription>
        </DialogHeader>

        {/* Environment Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Device Info */}
              <div className="flex items-center gap-3">
                {getDeviceIcon()}
                <div>
                  <div className="font-medium capitalize">{environment.device.class}</div>
                  <div className="text-xs text-muted-foreground">
                    {environment.device.memory}GB RAM
                  </div>
                </div>
              </div>

              {/* Power State */}
              <div className="flex items-center gap-3">
                {getPowerIcon()}
                <div>
                  <div className="font-medium">
                    {environment.device.powerState === 'battery' ? 'Batterie' : 
                     environment.device.powerState === 'ac' ? 'Secteur' : 'Inconnu'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {environment.device.online ? 'En ligne' : 'Hors ligne'}
                  </div>
                </div>
              </div>

              {/* Bridge Status */}
              <div className="flex items-center gap-3">
                {environment.bridge.available ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">
                    Bridge {environment.bridge.available ? 'Disponible' : 'Absent'}
                  </div>
                  {environment.bridge.available && (
                    <div className="text-xs text-muted-foreground">
                      {environment.bridge.device?.toUpperCase()} · {environment.bridge.models.length} modèles
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cached Models */}
            {hasAnyModelCached && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Modèles en cache :</span>
                {Object.entries(environment.cached)
                  .filter(([_, cached]) => cached)
                  .map(([model]) => (
                    <Badge key={model} variant="secondary" className="text-xs">
                      {model}
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Selection */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Choisir un modèle</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Sélectionnez le modèle de transcription à utiliser
            </p>
          </div>

          <RadioGroup 
            value={selectedModel} 
            onValueChange={(value) => setSelectedModel(value as WhisperModel | 'auto')}
            className="space-y-3"
          >
            {/* Auto Option */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-primary">
                      Auto (recommandé) → {models.recommended}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {recommendation?.reason}
                    </div>
                  </div>
                  <Badge variant="secondary">Recommandé</Badge>
                </div>
              </Label>
            </div>

            {/* Manual Options */}
            {models.models.map((modelInfo) => (
              <div 
                key={modelInfo.model}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  !modelInfo.available ? 'opacity-50 bg-muted/30' : 'bg-card'
                }`}
              >
                <RadioGroupItem 
                  value={modelInfo.model} 
                  id={modelInfo.model}
                  disabled={!modelInfo.available}
                />
                <Label 
                  htmlFor={modelInfo.model} 
                  className={`flex-1 ${modelInfo.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {modelInfo.model.charAt(0).toUpperCase() + modelInfo.model.slice(1)}
                        {modelInfo.cached && <CheckCircle className="h-4 w-4 text-success" />}
                        {modelInfo.requiresBridge && !environment.bridge.available && (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {modelInfo.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{modelInfo.size} Mo</div>
                      {modelInfo.cached ? (
                        <div className="text-xs text-success">En cache</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {modelInfo.requiresBridge ? 'Bridge' : 'Téléchargement'}
                        </div>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Contextual Advice */}
          {advice && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{advice}</p>
              </CardContent>
            </Card>
          )}

          {/* Download Progress */}
          {preparing && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Préparation en cours...</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onNeverShow}
              className="flex-1 sm:flex-none"
            >
              Ne plus proposer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSkip();
                onOpenChange(false);
              }}
              className="flex-1 sm:flex-none"
            >
              Plus tard
            </Button>
          </div>
          <Button
            onClick={handlePrepare}
            disabled={preparing}
            className="w-full sm:w-auto"
          >
            {preparing ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Préparation...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Préparer maintenant
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <p>
            🔒 Tout reste local — aucun cloud. Les modèles sont stockés sur cet appareil et supprimables à tout moment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
