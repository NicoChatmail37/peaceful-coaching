import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface Client {
  id: string;
  name: string;
  address?: string;
  npa?: string;
  city?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchClients = async () => {
    if (!activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [activeCompany]);

  return {
    clients,
    loading,
    refetch: fetchClients
  };
};