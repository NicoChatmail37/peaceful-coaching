import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  HardDrive,
  Monitor,
  Laptop,
  Smartphone,
  Wifi,
  Target,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { WhisperModel } from '@/lib/whisperService';
import type { EnvironmentProbe } from '@/lib/envProbe';
import { probeEnvironment, checkWebGPU, getPreferredWhisperModel, setPreferredWhisperModel } from '@/lib/envProbe';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableModelsWithRecommendation } from '@/lib/modelRecommendation';
import { modelDownloadService, formatBytes, type DownloadProgress } from '@/lib/modelDownloadService';
import { getTranscriptionDB } from '@/lib/transcriptionStorage';
import { useModelOnboarding } from '@/hooks/useModelOnboarding';

interface ModelStatus {
  model: WhisperModel;
  cached: boolean;
  size: number;
  available: boolean;
  requiresBridge: boolean;
  description: string;
  downloading?: boolean;
  progress?: number;
  downloadError?: string;
}

export const IALocalSettings = () => {
  const [environment, setEnvironment] = useState<EnvironmentProbe | null>(null);
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloads, setDownloads] = useState<Map<WhisperModel, DownloadProgress>>(new Map());
  const [preferredModel, setPreferredModelState] = useState<string>('tiny');
  const [preferences, setPreferences] = useState({
    defaultModel: 'auto' as WhisperModel | 'auto',
    showPrepareDay: true,
    preloadOnTabMount: false
  });

  const { setShowModal, probeAndShow } = useModelOnboarding();

  useEffect(() => {
    loadEnvironmentAndPreferences();
  }, []);

  const loadEnvironmentAndPreferences = async () => {
    setRefreshing(true);
    
    try {
      // Load environment
      const env = await probeEnvironment();
      setEnvironment(env);
      
      // Load preferred model
      const preferred = await getPreferredWhisperModel();
      setPreferredModelState(preferred);
      
      // Load model statuses
      const modelInfo = getAvailableModelsWithRecommendation(env);
      setModelStatuses(modelInfo.models.map(m => ({
        model: m.model,
        cached: m.cached,
        size: m.size * 1024 * 1024, // Convert MB to bytes
        available: m.available,
        requiresBridge: m.requiresBridge,
        description: m.description
      })));
      
      // Load preferences
      const db = await getTranscriptionDB();
      const [defaultModelPref, showPrepDayPref, preloadPref] = await Promise.all([
        db.get('prefs', 'defaultModel'),
        db.get('prefs', 'showPrepareDay'),
        db.get('prefs', 'preloadOnTabMount')
      ]);
      
      setPreferences({
        defaultModel: defaultModelPref?.value || 'auto',
        showPrepareDay: showPrepDayPref?.value !== false,
        preloadOnTabMount: preloadPref?.value || false
      });
      
    } catch (error) {
      console.error('Failed to load environment:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger l'état des modèles",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadModel = async (model: WhisperModel) => {
    try {
      await modelDownloadService.download(model, (progress) => {
        setDownloads(prev => new Map(prev.set(model, progress)));
        
        // Update model status with detailed progress info
        setModelStatuses(prev => prev.map(m => 
          m.model === model 
            ? { 
                ...m, 
                downloading: true, 
                progress: progress.progress,
                downloadError: progress.error
              }
            : m
        ));
      });
      
      // Strict re-check via IndexedDB after download
      const { checkModelAvailability } = await import('@/lib/whisperService');
      const isActuallyCached = await checkModelAvailability(model);
      
      // If not actually cached but preference says ready, fix the mismatch
      if (!isActuallyCached) {
        const db = await getTranscriptionDB();
        await db.delete('prefs', `model_${model}_ready`);
        console.warn('⚠️ Model marked ready but not in cache - preference cleared');
      }
      
      // Refresh statuses after download
      await loadEnvironmentAndPreferences();
      
      // Dispatch custom event to sync with CompactRecordingBar
      window.dispatchEvent(new CustomEvent('modelCacheUpdated', { detail: { model } }));
      
      toast({
        title: isActuallyCached ? "Téléchargement terminé ✅" : "Vérification requise",
        description: isActuallyCached 
          ? `Le modèle ${model} est maintenant disponible pour la transcription`
          : `Le téléchargement s'est terminé mais le modèle n'est pas détecté dans le cache. Réessayez.`,
        variant: isActuallyCached ? "default" : "destructive"
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Téléchargement échoué";
      console.error('Model download failed:', error);
      
      toast({
        title: "Échec du téléchargement",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setDownloads(prev => {
        const newMap = new Map(prev);
        newMap.delete(model);
        return newMap;
      });
      
      setModelStatuses(prev => prev.map(m => 
        m.model === model 
          ? { ...m, downloading: false, progress: undefined, downloadError: undefined }
          : m
      ));
    }
  };

  const handleDeleteModel = async (model: WhisperModel) => {
    try {
      // Use deleteModelCache to properly remove from IndexedDB
      const { deleteModelCache } = await import('@/lib/whisperService');
      await deleteModelCache(model);
      
      await loadEnvironmentAndPreferences();
      
      // Dispatch event to sync with CompactRecordingBar
      window.dispatchEvent(new CustomEvent('modelCacheUpdated', { detail: { model } }));
      
      toast({
        title: "Modèle supprimé",
        description: `Le modèle ${model} a été supprimé du cache`,
      });
      
    } catch (error) {
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Suppression échouée",
        variant: "destructive"
      });
    }
  };

  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      const db = await getTranscriptionDB();
      await db.put('prefs', { key, value });
      
      setPreferences(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: "Préférence mise à jour",
        description: "La configuration a été sauvegardée",
      });
      
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder la préférence",
        variant: "destructive"
      });
    }
  };

  const handleTestWebGPU = async () => {
    const webgpuInfo = await checkWebGPU();
    if (webgpuInfo.available) {
      toast({
        title: "WebGPU activé",
        description: webgpuInfo.adapter || "WebGPU fonctionne correctement"
      });
    } else {
      toast({
        title: "WebGPU désactivé",
        description: webgpuInfo.reason || "WebGPU non disponible",
        variant: "destructive"
      });
    }
  };

  const handleModelChange = async (model: string) => {
    await setPreferredWhisperModel(model);
    setPreferredModelState(model);
    toast({
      title: "Modèle par défaut mis à jour",
      description: `Le modèle ${model} sera utilisé pour toutes les transcriptions`,
    });
  };

  const getDeviceIcon = () => {
    if (!environment) return <Monitor className="h-4 w-4" />;
    switch (environment.device.class) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'laptop': return <Laptop className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const totalCacheSize = modelStatuses
    .filter(m => m.cached)
    .reduce((acc, m) => acc + m.size, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">IA Locale</h2>
          <p className="text-sm text-muted-foreground">
            Gestion des modèles de transcription locaux
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestWebGPU}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Test WebGPU
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEnvironmentAndPreferences}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Environment Status */}
      {environment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getDeviceIcon()}
              État de l'environnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <div>
                  <div className="font-medium capitalize">{environment.device.class}</div>
                  <div className="text-sm text-muted-foreground">
                    {environment.device.memory}GB RAM
                    {environment.device.memory > 16 && (
                      <span className="text-green-600 ml-1">(Mac M-series détecté)</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  environment.webgpu?.available ? 'bg-success' : 'bg-muted'
                }`}></div>
                <div>
                  <div className="font-medium">
                    WebGPU {environment.webgpu?.available ? 'Activé' : 'Désactivé'}
                  </div>
                  {environment.webgpu?.reason && !environment.webgpu.available && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {environment.webgpu.reason.length > 50 
                        ? environment.webgpu.reason.substring(0, 50) + '...'
                        : environment.webgpu.reason
                      }
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  environment.bridge.available ? 'bg-success' : 'bg-muted'
                }`}></div>
                <div>
                  <div className="font-medium">
                    Bridge {environment.bridge.available ? 'Disponible' : 'Absent'}
                  </div>
                  {environment.bridge.available && (
                    <div className="text-sm text-muted-foreground">
                      {environment.bridge.device?.toUpperCase()} · {environment.bridge.models.length} modèles
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex items-center">
              <div className="flex items-center gap-3">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Cache local</div>
                  <div className="text-sm text-muted-foreground">
                    {formatBytes(totalCacheSize)} utilisé
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Management */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration de transcription</CardTitle>
          <CardDescription>
            Sélectionnez le modèle par défaut et gérez vos modèles Whisper locaux
          </CardDescription>
        </CardHeader>
        
        {/* Preferred Model Selector */}
        <CardContent className="border-b pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <label className="text-sm font-semibold">Modèle par défaut pour toutes les transcriptions</label>
            </div>
            <Select value={preferredModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Browser models */}
                {modelStatuses.filter(m => m.cached && (m.model === 'tiny' || m.model === 'base')).map(m => (
                  <SelectItem key={m.model} value={m.model}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="capitalize">{m.model}</span>
                      <span className="text-xs text-muted-foreground">- Navigateur ({formatBytes(m.size)})</span>
                    </div>
                  </SelectItem>
                ))}
                {/* Bridge models */}
                {environment?.bridge.available && environment.bridge.models.map(model => (
                  <SelectItem key={model} value={model}>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="capitalize">{model}</span>
                      <span className="text-xs text-muted-foreground">- Bridge ({environment.bridge.device})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              🌍 Ce modèle sera utilisé automatiquement dans toutes les séances. La langue française est forcée.
            </p>
          </div>
        </CardContent>

        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Téléchargement de modèles</h3>
          <div className="space-y-4">
            {modelStatuses
              .filter(model => {
                // Afficher les modèles navigateur téléchargés
                if (model.cached && (model.model === 'tiny' || model.model === 'base')) return true;
                // Afficher les modèles bridge réellement disponibles
                if (environment?.bridge.available && environment.bridge.models.includes(model.model)) return true;
                // Afficher tiny/base même s'ils ne sont pas téléchargés (pour permettre le téléchargement)
                if (model.model === 'tiny' || model.model === 'base') return true;
                return false;
              })
              .map((model) => {
                const isAvailable = model.cached || 
                  (environment?.bridge.available && environment.bridge.models.includes(model.model));
                
                return (
                  <div key={model.model} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {isAvailable ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 fill-green-600/20 dark:fill-green-500/20" />
                              <Badge variant="secondary" className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800">
                                Prêt
                              </Badge>
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                          )}
                          <h3 className="font-medium capitalize">{model.model}</h3>
                        </div>
                        {!model.available && <AlertCircle className="h-4 w-4 text-warning" />}
                        {environment?.bridge.available && environment.bridge.models.includes(model.model) && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Bridge ({environment.bridge.device})
                          </Badge>
                        )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {model.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Taille: {formatBytes(model.size)}
                  </div>
                  
                  {model.downloading && model.progress !== undefined && (
                    <div className="mt-2">
                      <Progress value={model.progress} className="w-full h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        Téléchargement... {Math.round(model.progress)}%
                        {model.downloadError && (
                          <div className={`mt-1 ${
                            model.downloadError?.includes('WebGPU indisponible') ||
                            model.downloadError?.includes('Mode CPU') ||
                            model.downloadError?.includes('🐌') ||
                            model.downloadError?.includes('🚀')
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {model.downloadError}
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {model.cached && (model.model === 'tiny' || model.model === 'base') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteModel(model.model)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : environment?.bridge.available && environment.bridge.models.includes(model.model) ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const event = new CustomEvent('openBridgeTest');
                            window.dispatchEvent(event);
                          }}
                        >
                          Ouvrir Bridge Test →
                        </Button>
                      </div>
                    ) : !model.cached && (model.model === 'tiny' || model.model === 'base') && !model.downloading ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadModel(model.model)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    ) : model.downloading ? (
                      <Button variant="outline" size="sm" disabled>
                        <Download className="h-4 w-4 mr-2 animate-pulse" />
                        Téléchargement...
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          }
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences</CardTitle>
          <CardDescription>
            Configurez le comportement par défaut de la transcription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Afficher la configuration au démarrage</Label>
              <div className="text-sm text-muted-foreground">
                Propose automatiquement de configurer les modèles à l'ouverture
              </div>
            </div>
            <Switch
              checked={preferences.showPrepareDay}
              onCheckedChange={(checked) => handlePreferenceChange('showPrepareDay', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Pré-charger au montage de l'onglet</Label>
              <div className="text-sm text-muted-foreground">
                Charge automatiquement le modèle par défaut lors de l'ouverture de l'onglet transcription
              </div>
            </div>
            <Switch
              checked={preferences.preloadOnTabMount}
              onCheckedChange={(checked) => handlePreferenceChange('preloadOnTabMount', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              🔒 <strong>Confidentialité totale</strong> : Tous les modèles et transcriptions restent sur votre appareil.
            </p>
            <p>
              💾 <strong>Stockage local</strong> : Les modèles sont mis en cache par votre navigateur et peuvent être supprimés à tout moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};