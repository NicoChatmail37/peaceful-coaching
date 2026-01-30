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
  const [saving, setSaving] = useState(false);
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

  const createProduct = async (productData: Omit<Product, 'id'>) => {
    if (!activeCompany) return null;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from('products_services')
        .insert({
          ...productData,
          company_id: activeCompany.id,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit créé avec succès"
      });

      await fetchProducts();
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit",
        variant: "destructive"
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (id: string, productData: Partial<Omit<Product, 'id'>>) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('products_services')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit mis à jour"
      });

      await fetchProducts();
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le produit",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setSaving(true);
      // Soft delete - just set is_active to false
      const { error } = await supabase
        .from('products_services')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit supprimé"
      });

      await fetchProducts();
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCompany]);

  return {
    products,
    loading,
    saving,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  };
};