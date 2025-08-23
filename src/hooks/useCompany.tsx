import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  npa?: string;
  city?: string;
  phone?: string;
  email?: string;
  iban?: string;
  tva_number?: string;
  logo_url?: string;
  theme_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  createCompany: (company: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  const setActiveCompany = async (company: Company) => {
    try {
      // Update all companies to set is_active = false
      await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('user_id', user?.id);

      // Set the selected company as active
      await supabase
        .from('companies')
        .update({ is_active: true })
        .eq('id', company.id);

      setActiveCompanyState(company);
      localStorage.setItem('activeCompanyId', company.id);
      
      // Apply theme color
      document.documentElement.style.setProperty('--company-theme', company.theme_color);
      
      await refreshCompanies();
    } catch (error) {
      console.error('Error setting active company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de définir l'entreprise active",
        variant: "destructive",
      });
    }
  };

  const refreshCompanies = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCompanies(data || []);

      // Set active company from database or localStorage
      const active = data?.find(c => c.is_active);
      const savedActiveId = localStorage.getItem('activeCompanyId');
      
      if (active) {
        setActiveCompanyState(active);
        document.documentElement.style.setProperty('--company-theme', active.theme_color);
      } else if (savedActiveId) {
        const saved = data?.find(c => c.id === savedActiveId);
        if (saved) {
          await setActiveCompany(saved);
        }
      } else if (data && data.length > 0) {
        await setActiveCompany(data[0]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entreprises",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...companyData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      await refreshCompanies();
      
      // Set as active if it's the first company
      if (companies.length === 0) {
        await setActiveCompany(data);
      }

      toast({
        title: "Succès",
        description: "Entreprise créée avec succès",
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entreprise",
        variant: "destructive",
      });
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await refreshCompanies();
      
      // Update active company if it was updated
      if (activeCompany?.id === id) {
        const updated = companies.find(c => c.id === id);
        if (updated) {
          setActiveCompanyState({ ...updated, ...updates });
          if (updates.theme_color) {
            document.documentElement.style.setProperty('--company-theme', updates.theme_color);
          }
        }
      }

      toast({
        title: "Succès",
        description: "Entreprise mise à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'entreprise",
        variant: "destructive",
      });
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshCompanies();
      
      // If deleted company was active, set another one as active
      if (activeCompany?.id === id) {
        const remaining = companies.filter(c => c.id !== id);
        if (remaining.length > 0) {
          await setActiveCompany(remaining[0]);
        } else {
          setActiveCompanyState(null);
          localStorage.removeItem('activeCompanyId');
        }
      }

      toast({
        title: "Succès",
        description: "Entreprise supprimée avec succès",
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      refreshCompanies();
    } else {
      setCompanies([]);
      setActiveCompanyState(null);
    }
  }, [user]);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        setActiveCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        loading,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};