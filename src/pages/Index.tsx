import { useState } from "react";
import { Header } from "@/components/Header";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoicePreview } from "@/components/InvoicePreview";
import { InvoiceList } from "@/components/InvoiceList";
import { CompanySettings } from "@/components/CompanySettings";
import { CompanyManagement } from "@/components/CompanyManagement";
import { LLMSettings } from "@/components/LLMSettings";
import { PatientsAndSessions } from "@/components/PatientsAndSessions";
import { Agenda } from "@/components/Agenda";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Clients from "./Clients";
import Products from "./Products";
import { useInvoices } from "@/hooks/useInvoices";

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
  const [currentTab, setCurrentTab] = useState("agenda");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { invoices: supabaseInvoices } = useInvoices();

  const handleInvoiceCreate = (invoice: Invoice) => {
    setInvoices(prev => [...prev, invoice]);
    setSelectedInvoice(invoice);
    setCurrentTab("preview");
  };

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCurrentTab("preview");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Facturation Suisse
          </h1>
          <p className="text-muted-foreground text-lg">
            Créez vos factures avec QR-bill et exportez vers votre comptabilité
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              Agenda
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              Clients & Séances
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              Créer
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              Factures
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <span className="text-lg">📞</span>
              Contacts
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              Produits
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-6">
            <Agenda onOpenPatientTab={() => setCurrentTab('patients')} />
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <PatientsAndSessions />
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <InvoiceForm 
              onInvoiceCreate={handleInvoiceCreate}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {selectedInvoice ? (
              <InvoicePreview 
                invoice={selectedInvoice}
                onInvoiceStatusUpdate={(invoice, status) => {
                  setSelectedInvoice({ ...invoice, status });
                }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold mb-2">Aucune facture sélectionnée</h3>
                <p className="text-muted-foreground">
                  Créez une nouvelle facture ou sélectionnez-en une dans la liste
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <InvoiceList 
              invoices={invoices}
              onInvoiceSelect={handleInvoiceSelect}
            />
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Clients />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Products />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <CompanyManagement />
            <Separator />
            <CompanySettings />
            <Separator />
            <LLMSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;