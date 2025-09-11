import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface Payment {
  id: string;
  company_id: string;
  invoice_id: string;
  method: 'qr' | 'cash' | 'card';
  amount: number;
  fee_amount: number;
  paid_at: string;
  reference?: string;
  created_at: string;
}

export const usePayments = (invoiceId?: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchPayments = async () => {
    if (!activeCompany) return;

    try {
      setLoading(true);
      let query = supabase
        .from('invoice_payments')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('paid_at', { ascending: false });

      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const paymentsWithTypes = data?.map(payment => ({
        ...payment,
        method: payment.method as 'qr' | 'cash' | 'card'
      })) || [];

      setPayments(paymentsWithTypes);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async (paymentData: {
    invoice_id: string;
    method: 'qr' | 'cash' | 'card';
    amount: number;
    fee_amount?: number;
    paid_at?: Date;
    reference?: string;
  }) => {
    try {
      const { data: paymentId, error } = await supabase.rpc('rpc_record_payment', {
        p_invoice_id: paymentData.invoice_id,
        p_method: paymentData.method,
        p_amount: paymentData.amount,
        p_fee_amount: paymentData.fee_amount || 0,
        p_paid_at: paymentData.paid_at?.toISOString(),
        p_reference: paymentData.reference
      });

      if (error) throw error;

      const methodLabels = {
        qr: 'QR-bill',
        cash: 'Espèces',
        card: 'Carte bancaire'
      };

      toast({
        title: "Paiement enregistré",
        description: `Paiement par ${methodLabels[paymentData.method]} de CHF ${paymentData.amount} enregistré avec succès`
      });

      fetchPayments();
      return paymentId;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le paiement",
        variant: "destructive"
      });
      return null;
    }
  };

  const getTotalPayments = (invoiceId: string) => {
    return payments
      .filter(p => p.invoice_id === invoiceId)
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getTotalFees = (invoiceId: string) => {
    return payments
      .filter(p => p.invoice_id === invoiceId)
      .reduce((total, payment) => total + payment.fee_amount, 0);
  };

  const getPaymentsByMethod = (method: 'qr' | 'cash' | 'card') => {
    return payments.filter(p => p.method === method);
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Paiement supprimé",
        description: "Le paiement a été supprimé avec succès"
      });

      fetchPayments();
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le paiement",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeCompany, invoiceId]);

  return {
    payments,
    loading,
    fetchPayments,
    recordPayment,
    getTotalPayments,
    getTotalFees,
    getPaymentsByMethod,
    deletePayment
  };
};