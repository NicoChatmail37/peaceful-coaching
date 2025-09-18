import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceList } from "@/components/InvoiceList";
import { PatientsPanel } from "@/components/patients/PatientsPanel";
import { CompanyManagement } from "@/components/CompanyManagement";
import { CompanySettings } from "@/components/CompanySettings";
import { LLMSettings } from "@/components/LLMSettings";
import { FileText, Users, Package, Settings } from "lucide-react";

export const CatalogueView = () => {
  return (
    <div className="flex-1 p-6">
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produits
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Toutes les factures</h2>
          </div>
          {/* TODO: Fix InvoiceList props */}
          <div className="text-muted-foreground">Liste des factures à venir...</div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Contacts & Patients</h2>
          </div>
          {/* TODO: Fix PatientsPanel props */}
          <div className="text-muted-foreground">Liste des contacts à venir...</div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Produits & Services</h2>
          </div>
          {/* TODO: Products component */}
          <div className="text-muted-foreground">Gestion des produits à venir...</div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Paramètres</h2>
          </div>
          <div className="grid gap-6">
            <CompanyManagement />
            <CompanySettings />
            <LLMSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};