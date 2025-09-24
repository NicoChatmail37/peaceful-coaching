import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Brain, Wifi, WifiOff, RefreshCw, Save, ExternalLink } from "lucide-react";
import { getLLMBridgeStatus, type LLMBridgeStatus } from "@/lib/llmService";
import { toast } from "sonner";

interface LLMPreferences {
  backend: 'ollama' | 'lmstudio' | 'bridge' | 'disabled';
  ollamaUrl: string;
  lmstudioUrl: string;
  bridgeUrl: string;
  defaultModel: string;
  apiKey?: string;
}

const DEFAULT_PREFERENCES: LLMPreferences = {
  backend: 'bridge',
  ollamaUrl: 'http://localhost:11434',
  lmstudioUrl: 'http://localhost:1234',
  bridgeUrl: 'http://localhost:27123',
  defaultModel: 'llama3.1:8b',
  apiKey: ''
};

export const LLMSettings = () => {
  const [preferences, setPreferences] = useState<LLMPreferences>(DEFAULT_PREFERENCES);
  const [bridgeStatus, setBridgeStatus] = useState<LLMBridgeStatus | null>(null);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [saving, setSaving] = useState(false);

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('llm_preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Error parsing LLM preferences:', error);
      }
    }
  }, []);

  // Vérifier le statut du bridge au chargement
  useEffect(() => {
    checkBridgeStatus();
  }, []);

  const checkBridgeStatus = async () => {
    setCheckingBridge(true);
    console.log('🔍 Manual bridge status check initiated');
    
    try {
      const status = await getLLMBridgeStatus();
      console.log('📊 Bridge status result:', status);
      setBridgeStatus(status);
      
      // Show a toast with the result
      if (status.isConnected) {
        toast.success(`✅ Connected to ${status.backend} - ${status.models.length} models available`);
      } else {
        toast.error(`❌ Connection failed: ${status.error}`);
      }
    } catch (error) {
      console.error('❌ Error checking bridge status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Bridge check failed: ${errorMessage}`);
    } finally {
      setCheckingBridge(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('llm_preferences', JSON.stringify(preferences));
      
      toast.success("Paramètres sauvegardés avec succès");

      // Revérifier le bridge après sauvegarde
      await checkBridgeStatus();
    } catch (error) {
      toast.error("Impossible de sauvegarder les paramètres");
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof LLMPreferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <CardTitle className="text-lg">LLM Local</CardTitle>
          </div>
        </div>
        <CardDescription>
          Configuration pour l'analyse IA locale via Ollama ou LM Studio. 
          Toutes les données restent 100% privées sur votre machine.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {bridgeStatus?.isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {bridgeStatus.backend} connecté ({bridgeStatus.models.length} modèles)
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <Badge variant="destructive">
                  {bridgeStatus?.backend === 'disabled' ? 'LLM désactivé' : 
                   `${bridgeStatus?.backend || 'LLM'} non accessible`}
                </Badge>
              </>
            )}
          </div>
          
          <Button 
            onClick={checkBridgeStatus} 
            disabled={checkingBridge}
            size="sm"
            variant="outline"
          >
            {checkingBridge ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Vérifier"
            )}
          </Button>
        </div>

        {/* Debug information */}
        {bridgeStatus && !bridgeStatus.isConnected && bridgeStatus.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700 font-medium mb-1">Erreur de connexion:</p>
            <p className="text-xs text-red-600 font-mono">{bridgeStatus.error}</p>
            {bridgeStatus.backend === 'ollama' && (
              <div className="mt-2 text-xs text-red-600">
                <p>• Vérifiez qu'Ollama est démarré : <code>ollama serve</code></p>
                <p>• Testez dans votre navigateur : <a href="http://localhost:11434/api/tags" target="_blank" className="underline inline-flex items-center gap-1">http://localhost:11434/api/tags <ExternalLink className="h-3 w-3" /></a></p>
                <p>• Listez vos modèles : <code>ollama list</code></p>
              </div>
            )}
            {bridgeStatus.backend === 'lmstudio' && (
              <div className="mt-2 text-xs text-red-600">
                <p>• Vérifiez que LM Studio Server est démarré</p>
                <p>• Dans LM Studio → Local Server → Enable "Local Server"</p>
                <p>• Cochez "Allow external connections" si nécessaire</p>
                <p>• Testez dans votre navigateur : <a href="http://localhost:1234/v1/models" target="_blank" className="underline inline-flex items-center gap-1">http://localhost:1234/v1/models <ExternalLink className="h-3 w-3" /></a></p>
              </div>
            )}
            {bridgeStatus.backend === 'bridge' && (
              <div className="mt-2 text-xs text-red-600">
                <p>• Vérifiez que le bridge est démarré sur le port 27123</p>
                <p>• Testez dans votre navigateur : <a href={`${preferences.bridgeUrl}/status`} target="_blank" className="underline inline-flex items-center gap-1">{preferences.bridgeUrl}/status <ExternalLink className="h-3 w-3" /></a></p>
                <p>• Le bridge fait automatiquement le lien vers Ollama/LM Studio</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Configuration Backend */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="backend">Backend LLM</Label>
            <Select 
              value={preferences.backend} 
              onValueChange={(value) => handlePreferenceChange('backend', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bridge">Bridge (recommandé si CORS/pare-feu)</SelectItem>
                <SelectItem value="ollama">Ollama (direct)</SelectItem>
                <SelectItem value="lmstudio">LM Studio (direct)</SelectItem>
                <SelectItem value="disabled">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* URLs de configuration */}
          {preferences.backend !== 'disabled' && (
            <>
              <div>
                <Label htmlFor="ollama-url">URL Ollama</Label>
                <Input
                  id="ollama-url"
                  value={preferences.ollamaUrl}
                  onChange={(e) => handlePreferenceChange('ollamaUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="lmstudio-url">URL LM Studio</Label>
                <Input
                  id="lmstudio-url"
                  value={preferences.lmstudioUrl}
                  onChange={(e) => handlePreferenceChange('lmstudioUrl', e.target.value)}
                  placeholder="http://localhost:1234"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="bridge-url">URL Bridge</Label>
                <Input
                  id="bridge-url"
                  value={preferences.bridgeUrl}
                  onChange={(e) => handlePreferenceChange('bridgeUrl', e.target.value)}
                  placeholder="http://localhost:27123"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Testez: <a href={`${preferences.bridgeUrl}/status`} target="_blank" className="underline inline-flex items-center gap-1">{preferences.bridgeUrl}/status <ExternalLink className="h-3 w-3" /></a>
                </p>
              </div>

              <div>
                <Label htmlFor="default-model">Modèle par défaut</Label>
                <Input
                  id="default-model"
                  value={preferences.defaultModel}
                  onChange={(e) => handlePreferenceChange('defaultModel', e.target.value)}
                  placeholder="llama3.1:8b"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Modèles recommandés: llama3.1:8b, mistral:7b, qwen2.5:7b
                </p>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Clé API (optionnelle pour certains services) */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">Clé API (Optionnelle)</Label>
            <Input
              id="api-key"
              type="password"
              value={preferences.apiKey || ''}
              onChange={(e) => handlePreferenceChange('apiKey', e.target.value)}
              placeholder="Clé API si nécessaire..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Certains modèles ou services peuvent nécessiter une clé API. 
              Laissez vide pour Ollama/LM Studio standard.
            </p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            🔒 Toutes les données restent sur votre machine
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};