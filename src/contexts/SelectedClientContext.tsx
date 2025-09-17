import { createContext, useContext, useState, ReactNode } from 'react';
import { Client } from '@/hooks/useClients';

interface SelectedClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
}

const SelectedClientContext = createContext<SelectedClientContextType | undefined>(undefined);

export const useSelectedClient = () => {
  const context = useContext(SelectedClientContext);
  if (!context) {
    throw new Error('useSelectedClient must be used within a SelectedClientProvider');
  }
  return context;
};

export const SelectedClientProvider = ({ children }: { children: ReactNode }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <SelectedClientContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
      }}
    >
      {children}
    </SelectedClientContext.Provider>
  );
};