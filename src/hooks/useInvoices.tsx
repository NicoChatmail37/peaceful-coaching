import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface InvoiceData {
  id?: string;
  user_id?: string;
  company_id?: string;
  client_id?: string;
  number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tva_rate: number;
  tva_amount: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItemData {
  id?: string;
  invoice_id?: string;
  product_service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface FullInvoice extends InvoiceData {
  items: InvoiceItemData[];
  // Client info for display
  clientName: string;
  clientAddress: string;
  clientNPA: string;
  clientCity: string;
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<FullInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchInvoices = async () => {
    if (!activeCompany?.id) return;

    setLoading(true);
    try {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, address, npa, city)
        `)
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch items for each invoice
      const invoicesWithItems: FullInvoice[] = [];
      for (const invoice of invoicesData || []) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id);

        if (itemsError) throw itemsError;

        invoicesWithItems.push({
          ...invoice,
          items: itemsData || [],
          clientName: invoice.clients?.name || '',
          clientAddress: invoice.clients?.address || '',
          clientNPA: invoice.clients?.npa || '',
          clientCity: invoice.clients?.city || '',
          status: (invoice.status as 'draft' | 'sent' | 'paid') || 'draft'
        });
      }

      setInvoices(invoicesWithItems);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des factures",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async (invoiceData: FullInvoice): Promise<string | null> => {
    if (!activeCompany?.id) {
      toast({
        title: "Erreur",
        description: "Aucune entreprise sélectionnée",
        variant: "destructive"
      });
      return null;
    }

    try {
      // First, save the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          company_id: activeCompany.id,
          number: invoiceData.number,
          date: invoiceData.date,
          due_date: invoiceData.due_date,
          subtotal: invoiceData.subtotal,
          tva_rate: invoiceData.tva_rate,
          tva_amount: invoiceData.tva_amount,
          total: invoiceData.total,
          notes: invoiceData.notes,
          status: invoiceData.status
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Then save the invoice items
      if (invoiceData.items && invoiceData.items.length > 0) {
        const itemsToInsert = invoiceData.items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          product_service_id: item.product_service_id
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchInvoices();
      
      toast({
        title: "Succès",
        description: "Facture sauvegardée avec succès"
      });

      return invoice.id;
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde de la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: 'draft' | 'sent' | 'paid') => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId);

      if (error) throw error;

      await fetchInvoices();
      
      toast({
        title: "Statut mis à jour",
        description: `Statut de la facture mis à jour: ${status}`
      });
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeCompany]);

  return {
    invoices,
    loading,
    fetchInvoices,
    saveInvoice,
    updateInvoiceStatus
  };
};