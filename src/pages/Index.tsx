import { useState } from "react";
import { Header } from "@/components/Header";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoicePreview } from "@/components/InvoicePreview";
import { InvoiceList } from "@/components/InvoiceList";
import { CompanySettings } from "@/components/CompanySettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export interface CompanyInfo {
  name: string;
  address: string;
  npa: string;
  city: string;
  phone: string;
  email: string;
  iban: string;
  tvaNumber?: string;
}

const Index = () => {
  const [currentTab, setCurrentTab] = useState("create");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    npa: "",
    city: "",
    phone: "",
    email: "",
    iban: "",
    tvaNumber: ""
  });

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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              Créer
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              Factures
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <InvoiceForm 
              onInvoiceCreate={handleInvoiceCreate}
              companyInfo={companyInfo}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {selectedInvoice ? (
              <InvoicePreview 
                invoice={selectedInvoice} 
                companyInfo={companyInfo}
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

          <TabsContent value="settings" className="space-y-6">
            <CompanySettings 
              companyInfo={companyInfo}
              onCompanyInfoChange={setCompanyInfo}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;