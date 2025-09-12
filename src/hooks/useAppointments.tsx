import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  title?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  status: 'scheduled' | 'done' | 'canceled' | 'no_show';
  session_id?: string;
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithClient extends Appointment {
  client_name: string;
  client_email?: string;
}

export const useAppointments = (startDate?: Date, endDate?: Date) => {
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchAppointments = async () => {
    if (!activeCompany) return;

    try {
      setLoading(true);
      let query = supabase
        .from('invoice_appointments')
        .select(`
          *,
          clients!fk_appointments_client_id(name, email)
        `)
        .eq('company_id', activeCompany.id)
        .order('starts_at', { ascending: true });

      if (startDate) {
        query = query.gte('starts_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('starts_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const appointmentsWithClient = data?.map(appointment => ({
        ...appointment,
        status: appointment.status as 'scheduled' | 'done' | 'canceled' | 'no_show',
        client_name: (appointment.clients as any)?.name || 'Client inconnu',
        client_email: (appointment.clients as any)?.email
      })) || [];

      setAppointments(appointmentsWithClient);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'agenda",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointmentData: {
    client_id: string;
    title?: string;
    starts_at: Date;
    ends_at: Date;
    location?: string;
  }) => {
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
        .from('invoice_appointments')
        .insert({
          ...appointmentData,
          starts_at: appointmentData.starts_at.toISOString(),
          ends_at: appointmentData.ends_at.toISOString(),
          company_id: activeCompany.id,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rendez-vous créé",
        description: "Le rendez-vous a été ajouté à l'agenda"
      });

      fetchAppointments();
      return data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    try {
      const { error } = await supabase
        .from('invoice_appointments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Rendez-vous mis à jour",
        description: "Les modifications ont été sauvegardées"
      });

      fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rendez-vous",
        variant: "destructive"
      });
      return false;
    }
  };

  const convertToSession = async (appointmentId: string) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Créer la séance
      const { data: sessionId, error: sessionError } = await supabase.rpc('rpc_create_session', {
        p_client_id: appointment.client_id,
        p_started_at: appointment.starts_at
      });

      if (sessionError) throw sessionError;

      // Mettre à jour le RDV avec l'ID de session et marquer comme "done"
      const { error: updateError } = await supabase
        .from('invoice_appointments')
        .update({
          session_id: sessionId,
          status: 'done',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      toast({
        title: "Séance créée",
        description: "Le rendez-vous a été converti en séance active"
      });

      fetchAppointments();
      return sessionId;
    } catch (error) {
      console.error('Error converting appointment to session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de convertir le rendez-vous en séance",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('invoice_appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Rendez-vous supprimé",
        description: "Le rendez-vous a été supprimé de l'agenda"
      });

      fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous",
        variant: "destructive"
      });
      return false;
    }
  };

  const getUninvoicedAppointments = async () => {
    if (!activeCompany) return [];

    try {
      const { data, error } = await supabase
        .from('view_uninvoiced_appointments')
        .select('*')
        .eq('company_id', activeCompany.id);

      if (error) throw error;

      return data?.map(appointment => ({
        ...appointment,
        status: appointment.status as 'scheduled' | 'done' | 'canceled' | 'no_show',
        client_name: appointment.client_name || 'Client inconnu',
        client_email: appointment.client_email
      })) || [];
    } catch (error) {
      console.error('Error fetching uninvoiced appointments:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeCompany, startDate, endDate]);

  return {
    appointments,
    loading,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    convertToSession,
    deleteAppointment,
    getUninvoicedAppointments
  };
};