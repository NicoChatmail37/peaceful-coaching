import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface Session {
  id: string;
  company_id: string;
  client_id: string;
  title?: string;
  transcript_text?: string;
  notes_text?: string;
  started_at?: string;
  ended_at?: string;
  status: 'draft' | 'done' | 'canceled';
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionWithClient extends Session {
  client_name: string;
  client_email?: string;
}

let autosaveTimeout: NodeJS.Timeout;

export const useSessions = (clientId?: string) => {
  const [sessions, setSessions] = useState<SessionWithClient[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchSessions = async () => {
    if (!activeCompany) return;

    try {
      setLoading(true);
      let query = supabase
        .from('invoice_sessions')
        .select(`
          *,
          clients!fk_sessions_client_id(name, email)
        `)
        .eq('company_id', activeCompany.id)
        .order('started_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const sessionsWithClient = data?.map(session => ({
        ...session,
        status: session.status as 'draft' | 'done' | 'canceled',
        client_name: (session.clients as any)?.name || 'Client inconnu',
        client_email: (session.clients as any)?.email
      })) || [];

      setSessions(sessionsWithClient);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: "Erreur",
        description: `Impossible de charger les séances: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (clientId: string, startedAt?: Date) => {
    try {
      const { data, error } = await supabase.rpc('rpc_create_session', {
        p_client_id: clientId,
        p_started_at: startedAt?.toISOString()
      });

      if (error) throw error;

      toast({
        title: "Séance créée",
        description: "Une nouvelle séance a été initiée"
      });

      fetchSessions();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la séance",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<Session>) => {
    try {
      const { error } = await supabase
        .from('invoice_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Mise à jour optimiste
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updates, updated_at: new Date().toISOString() }
          : session
      ));

      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la séance",
        variant: "destructive"
      });
      return false;
    }
  };

  // Autosave avec debounce (800ms)
  const autosaveSession = useCallback((sessionId: string, field: 'transcript_text' | 'notes_text', value: string) => {
    clearTimeout(autosaveTimeout);
    
    autosaveTimeout = setTimeout(() => {
      updateSession(sessionId, { [field]: value });
    }, 800);
  }, []);

  const finalizeSession = async (sessionId: string, title?: string, endedAt?: Date) => {
    try {
      const { error } = await supabase.rpc('rpc_finalize_session', {
        p_session_id: sessionId,
        p_ended_at: endedAt?.toISOString(),
        p_title: title
      });

      if (error) throw error;

      toast({
        title: "Séance finalisée",
        description: "La séance est maintenant terminée et peut être facturée"
      });

      fetchSessions();
      return true;
    } catch (error) {
      console.error('Error finalizing session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser la séance",
        variant: "destructive"
      });
      return false;
    }
  };

  const invoiceFromSession = async (sessionId: string, productId?: string, quantity?: number, unitPrice?: number) => {
    try {
      const { data: invoiceId, error } = await supabase.rpc('rpc_invoice_from_session', {
        p_session_id: sessionId,
        p_product_id: productId,
        p_quantity: quantity,
        p_unit_price: unitPrice
      });

      if (error) throw error;

      toast({
        title: "Facture créée",
        description: "Une facture brouillon a été générée depuis cette séance"
      });

      fetchSessions();
      return invoiceId;
    } catch (error) {
      console.error('Error creating invoice from session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('invoice_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Séance supprimée",
        description: "La séance a été supprimée avec succès"
      });

      fetchSessions();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la séance",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeCompany, clientId]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    autosaveSession,
    finalizeSession,
    invoiceFromSession,
    deleteSession
  };
};