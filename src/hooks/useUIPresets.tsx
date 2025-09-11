import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface UILabels {
  sessionLabel: string;
  agendaLabel: string;
  notesLabel: string;
  fieldLabels: {
    transcript: string;
    todo: string;
    [key: string]: string;
  };
  [key: string]: any;
}

export interface UIPresets {
  company_id: string;
  labels_json: UILabels;
  updated_at: string;
}

// Présets métier prédéfinis
export const BUSINESS_PRESETS = {
  therapist: {
    sessionLabel: "Séance",
    agendaLabel: "Agenda",
    notesLabel: "Notes",
    fieldLabels: {
      transcript: "Compte-rendu",
      todo: "Plan de traitement"
    }
  },
  coaching: {
    sessionLabel: "Session",
    agendaLabel: "Planning",
    notesLabel: "Notes",
    fieldLabels: {
      transcript: "Résumé",
      todo: "Objectifs"
    }
  },
  consultant: {
    sessionLabel: "Consultation",
    agendaLabel: "Agenda",
    notesLabel: "Notes",
    fieldLabels: {
      transcript: "Compte-rendu",
      todo: "Actions"
    }
  },
  artisan: {
    sessionLabel: "Intervention",
    agendaLabel: "Planning",
    notesLabel: "Notes",
    fieldLabels: {
      transcript: "Rapport",
      todo: "Travaux à prévoir"
    }
  }
} as const;

export const useUIPresets = () => {
  const [presets, setPresets] = useState<UILabels | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchPresets = async () => {
    if (!activeCompany) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('company_ui_presets')
        .select('*')
        .eq('company_id', activeCompany.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPresets(data.labels_json as UILabels);
      } else {
        // Créer des présets par défaut pour cette entreprise
        const defaultPresets = BUSINESS_PRESETS.therapist;
        await createDefaultPresets(defaultPresets);
        setPresets(defaultPresets);
      }
    } catch (error) {
      console.error('Error fetching UI presets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les préférences d'affichage",
        variant: "destructive"
      });
      // Fallback sur les présets par défaut
      setPresets(BUSINESS_PRESETS.therapist);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPresets = async (defaultLabels: UILabels) => {
    if (!activeCompany) return;

    try {
      const { error } = await supabase
        .from('company_ui_presets')
        .insert({
          company_id: activeCompany.id,
          labels_json: defaultLabels
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating default presets:', error);
    }
  };

  const updatePresets = async (newLabels: UILabels) => {
    if (!activeCompany) {
      toast({
        title: "Erreur",
        description: "Aucune entreprise active sélectionnée",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('company_ui_presets')
        .upsert({
          company_id: activeCompany.id,
          labels_json: newLabels,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setPresets(newLabels);
      
      toast({
        title: "Préférences sauvegardées",
        description: "Vos libellés personnalisés ont été mis à jour"
      });

      return true;
    } catch (error) {
      console.error('Error updating presets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences",
        variant: "destructive"
      });
      return false;
    }
  };

  const applyBusinessPreset = async (presetKey: keyof typeof BUSINESS_PRESETS) => {
    const preset = BUSINESS_PRESETS[presetKey];
    return await updatePresets(preset);
  };

  const resetToDefaults = async () => {
    return await updatePresets(BUSINESS_PRESETS.therapist);
  };

  // Fonctions utilitaires pour accéder aux libellés
  const getLabel = (key: string, fallback?: string) => {
    if (!presets) return fallback || key;
    return presets[key] || fallback || key;
  };

  const getFieldLabel = (fieldKey: string, fallback?: string) => {
    if (!presets?.fieldLabels) return fallback || fieldKey;
    return presets.fieldLabels[fieldKey] || fallback || fieldKey;
  };

  useEffect(() => {
    fetchPresets();
  }, [activeCompany]);

  return {
    presets,
    loading,
    fetchPresets,
    updatePresets,
    applyBusinessPreset,
    resetToDefaults,
    getLabel,
    getFieldLabel,
    businessPresets: BUSINESS_PRESETS
  };
};