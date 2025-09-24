import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import type { WhisperModel } from '@/lib/whisperService';
import type { EnvironmentProbe } from '@/lib/envProbe';
import { probeEnvironment } from '@/lib/envProbe';
import { recommendModel } from '@/lib/modelRecommendation';
import { modelDownloadService, type DownloadProgress } from '@/lib/modelDownloadService';
import { getTranscriptionDB } from '@/lib/transcriptionStorage';

interface OnboardingPreferences {
  showPrepareDay: boolean;
  defaultModel: WhisperModel | 'auto';
  lastPreparedAt: string | null;
}

interface UseModelOnboardingReturn {
  // State
  showModal: boolean;
  environment: EnvironmentProbe | null;
  preferences: OnboardingPreferences | null;
  downloadProgress: DownloadProgress | null;
  
  // Actions
  probeAndShow: () => Promise<void>;
  handlePrepareModel: (model: WhisperModel | 'auto') => Promise<void>;
  handleSkip: () => void;
  handleNeverShow: () => void;
  setShowModal: (show: boolean) => void;
  
  // Utilities
  shouldShowOnboarding: () => Promise<boolean>;
}

export function useModelOnboarding(): UseModelOnboardingReturn {
  const [showModal, setShowModal] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentProbe | null>(null);
  const [preferences, setPreferences] = useState<OnboardingPreferences | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const db = await getTranscriptionDB();
      const [showPref, defaultModelPref, lastPreparedPref] = await Promise.all([
        db.get('prefs', 'showPrepareDay'),
        db.get('prefs', 'defaultModel'),
        db.get('prefs', 'lastPreparedAt')
      ]);

      setPreferences({
        showPrepareDay: showPref?.value !== false, // Default true
        defaultModel: defaultModelPref?.value || 'auto',
        lastPreparedAt: lastPreparedPref?.value || null
      });
    } catch (error) {
      console.warn('Failed to load onboarding preferences:', error);
      setPreferences({
        showPrepareDay: true,
        defaultModel: 'auto',
        lastPreparedAt: null
      });
    }
  };

  const savePreferences = async (newPrefs: Partial<OnboardingPreferences>) => {
    try {
      const db = await getTranscriptionDB();
      const tx = db.transaction(['prefs'], 'readwrite');
      
      if (newPrefs.showPrepareDay !== undefined) {
        await tx.objectStore('prefs').put({
          key: 'showPrepareDay',
          value: newPrefs.showPrepareDay
        });
      }
      
      if (newPrefs.defaultModel !== undefined) {
        await tx.objectStore('prefs').put({
          key: 'defaultModel',
          value: newPrefs.defaultModel
        });
      }
      
      if (newPrefs.lastPreparedAt !== undefined) {
        await tx.objectStore('prefs').put({
          key: 'lastPreparedAt',
          value: newPrefs.lastPreparedAt
        });
      }
      
      await tx.done;
      
      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
    }
  };

  const shouldShowOnboarding = async (): Promise<boolean> => {
    if (!preferences?.showPrepareDay) return false;
    
    // Show if never prepared or if it's been more than 7 days
    if (!preferences.lastPreparedAt) return true;
    
    const lastPrepared = new Date(preferences.lastPreparedAt);
    const daysSince = (Date.now() - lastPrepared.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSince > 7;
  };

  const probeAndShow = async () => {
    try {
      // Probe environment
      const env = await probeEnvironment();
      setEnvironment(env);
      
      // Check if we should show onboarding
      const shouldShow = await shouldShowOnboarding();
      if (shouldShow) {
        setShowModal(true);
      }
    } catch (error) {
      console.error('Failed to probe environment:', error);
      toast({
        title: "Erreur de détection",
        description: "Impossible de détecter l'environnement",
        variant: "destructive"
      });
    }
  };

  const handlePrepareModel = async (selectedModel: WhisperModel | 'auto') => {
    if (!environment) return;

    try {
      const actualModel = selectedModel === 'auto' 
        ? recommendModel(environment).model 
        : selectedModel;

      // For bridge models, just save preference
      if ((actualModel === 'small' || actualModel === 'medium') && environment.bridge.available) {
        await savePreferences({
          defaultModel: selectedModel,
          lastPreparedAt: new Date().toISOString()
        });
        
        toast({
          title: "Modèle configuré",
          description: `Le modèle ${actualModel} sera utilisé via le bridge local`,
        });
        return;
      }

      // For browser models, download if needed
      await modelDownloadService.download(actualModel, (progress) => {
        setDownloadProgress(progress);
      });

      await savePreferences({
        defaultModel: selectedModel,
        lastPreparedAt: new Date().toISOString()
      });

      setDownloadProgress(null);
      
    } catch (error) {
      setDownloadProgress(null);
      throw error;
    }
  };

  const handleSkip = () => {
    // Create a toast reminder
    toast({
      title: "Transcription reportée",
      description: "Vous pourrez configurer la transcription plus tard dans les paramètres",
      action: (
        <button 
          onClick={() => setShowModal(true)}
          className="text-sm underline"
        >
          Configurer maintenant
        </button>
      )
    });
  };

  const handleNeverShow = async () => {
    await savePreferences({ showPrepareDay: false });
    
    toast({
      title: "Configuration désactivée",
      description: "Vous pouvez réactiver cette configuration dans les paramètres",
    });
  };

  return {
    showModal,
    environment,
    preferences,
    downloadProgress,
    probeAndShow,
    handlePrepareModel,
    handleSkip,
    handleNeverShow,
    setShowModal,
    shouldShowOnboarding
  };
}