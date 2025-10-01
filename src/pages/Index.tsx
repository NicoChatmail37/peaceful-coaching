import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { TopTabs } from "@/components/layout/TopTabs";
import { JourView } from "@/components/layout/JourView";
import { CatalogueView } from "@/components/layout/CatalogueView";
import { TechnicalSettingsView } from "@/components/layout/TechnicalSettingsView";

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  clientNPA: string;
  clientCity: string;
  items: InvoiceItem[];
  total: number;
  tva: number;
  totalWithTva: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}


const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTopTab = searchParams.get('view') || 'jour';

  const handleTopTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', value);
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <TopTabs 
        value={activeTopTab} 
        onValueChange={handleTopTabChange} 
      />

      <div className="flex-1 overflow-hidden">
        {activeTopTab === 'jour' ? (
          <JourView />
        ) : activeTopTab === 'catalogue' ? (
          <CatalogueView />
        ) : activeTopTab === 'settings' ? (
          <TechnicalSettingsView />
        ) : (
          <JourView />
        )}
      </div>
    </div>
  );
};

export default Index;