import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  is_service: boolean;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchProducts = async () => {
    if (!activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_active', true)
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCompany]);

  return {
    products,
    loading,
    refetch: fetchProducts
  };
};