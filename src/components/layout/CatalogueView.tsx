import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package, Settings } from "lucide-react";
import { ContactsInvoicesTab } from "./tabs/ContactsInvoicesTab";
import { ProductsTab } from "./tabs/ProductsTab";
import { SettingsTab } from "./tabs/SettingsTab";

export const CatalogueView = () => {
  return (
    <div className="flex-1">
      <Tabs defaultValue="contacts-invoices" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border h-12 bg-muted/30">
          <TabsTrigger value="contacts-invoices" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts & Factures
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

        <div className="flex-1 overflow-hidden">
          <TabsContent value="contacts-invoices" className="h-full mt-0">
            <ContactsInvoicesTab />
          </TabsContent>

          <TabsContent value="products" className="h-full mt-0">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="settings" className="h-full mt-0">
            <SettingsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};