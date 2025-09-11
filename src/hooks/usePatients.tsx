import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";
import { Client, useClients } from "./useClients";

// Alias intelligent : les patients sont des clients avec logique métier spécialisée
export const usePatients = () => {
  const { clients, loading, refetch } = useClients();
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  // Patients = clients avec logique métier spécialisée
  const patients = clients;

  const createPatient = async (patientData: Omit<Client, 'id'>) => {
    if (!activeCompany) {
      toast({
        title: "Erreur",
        description: "Aucune entreprise active sélectionnée",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...patientData,
          company_id: activeCompany.id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Patient créé",
        description: `${patientData.name} a été ajouté avec succès`
      });

      refetch();
      return data;
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le patient",
        variant: "destructive"
      });
      return null;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Patient mis à jour",
        description: "Les informations ont été sauvegardées"
      });

      refetch();
      return true;
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le patient",
        variant: "destructive"
      });
      return false;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Patient supprimé",
        description: "Le patient a été supprimé avec succès"
      });

      refetch();
      return true;
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le patient",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    patients,
    loading,
    refetch,
    createPatient,
    updatePatient,
    deletePatient
  };
};