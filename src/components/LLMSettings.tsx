import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Settings, Wifi, WifiOff, AlertCircle, Save } from "lucide-react";
import { getLLMBridgeStatus, LLMBridgeStatus } from "@/lib/llmService";
import { toast } from "@/hooks/use-toast";
import { IALocalSettings } from "@/components/transcription/IALocalSettings";

interface LLMPreferences {
  backend: 'ollama' | 'lmstudio' | 'disabled';
  ollamaUrl: string;
  lmstudioUrl: string;
  defaultModel: string;
  apiKey?: string;
}

const DEFAULT_PREFERENCES: LLMPreferences = {
  backend: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  lmstudioUrl: 'http://localhost:1234',
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
    try {
      // Check based on selected backend
      let status = null;
      
      if (preferences.backend === 'ollama') {
        try {
          const response = await fetch(`${preferences.ollamaUrl}/api/tags`);
          if (response.ok) {
            const data = await response.json();
            status = {
              ok: true,
              backend: 'ollama' as const,
              available_models: data.models?.map((m: any) => m.name) || [],
              default_model: preferences.defaultModel
            };
          }
        } catch (error) {
          console.log('Ollama not available:', error);
        }
      } else if (preferences.backend === 'lmstudio') {
        try {
          const response = await fetch(`${preferences.lmstudioUrl}/v1/models`);
          if (response.ok) {
            const data = await response.json();
            status = {
              ok: true,
              backend: 'lmstudio' as const,
              available_models: data.data?.map((m: any) => m.id) || [],
              default_model: preferences.defaultModel
            };
          }
        } catch (error) {
          console.log('LM Studio not available:', error);
        }
      }
      
      setBridgeStatus(status);
    } catch (error) {
      setBridgeStatus(null);
    } finally {
      setCheckingBridge(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('llm_preferences', JSON.stringify(preferences));
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos préférences LLM ont été enregistrées"
      });

      // Revérifier le bridge après sauvegarde
      await checkBridgeStatus();
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive"
      });
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
            <CardTitle className="text-lg">IA Locale (LLM)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bridgeStatus?.ok ? "default" : "outline"}>
              {checkingBridge ? (
                "Vérification..."
              ) : bridgeStatus?.ok ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Connecté ({bridgeStatus.backend})
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Non disponible
                </>
              )}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={checkBridgeStatus}
              disabled={checkingBridge}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Configuration pour l'analyse IA locale via Ollama ou LM Studio. 
          Toutes les données restent 100% privées sur votre machine.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statut du Bridge */}
        {bridgeStatus?.ok ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-800 mb-2">
              <Wifi className="h-4 w-4" />
              <span className="font-medium">Bridge LLM Actif</span>
            </div>
            <div className="text-sm text-emerald-700 space-y-1">
              <p>Backend: <strong>{bridgeStatus.backend?.toUpperCase()}</strong></p>
              <p>Modèle par défaut: <strong>{bridgeStatus.default_model}</strong></p>
              <p>Modèles disponibles: {bridgeStatus.available_models?.length || 0}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Bridge LLM Non Détecté</span>
            </div>
            <div className="text-sm text-amber-700">
              <p>Démarrez Ollama ou LM Studio pour activer l'IA locale.</p>
              <p className="mt-1">
                <strong>Ollama:</strong> <code>ollama serve</code><br/>
                <strong>LM Studio:</strong> Onglet "Local Server" → Start Server
              </p>
            </div>
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
                <SelectItem value="ollama">Ollama (recommandé)</SelectItem>
                <SelectItem value="lmstudio">LM Studio</SelectItem>
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