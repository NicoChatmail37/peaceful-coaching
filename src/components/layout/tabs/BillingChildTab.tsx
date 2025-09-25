import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Euro } from "lucide-react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useInvoices } from "@/hooks/useInvoices";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Invoice } from "@/pages/Index";
import { InvoicePreview } from "@/components/InvoicePreview";
import { FullInvoice } from "@/hooks/useInvoices";

interface BillingChildTabProps {
  clientId: string | null;
}

export const BillingChildTab = ({ clientId }: BillingChildTabProps) => {
  const { invoices, loading } = useInvoices();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<FullInvoice | null>(null);

  // Filter invoices for selected client
  const clientInvoices = invoices.filter(invoice => 
    clientId && invoice.client_id === clientId
  );

  const handleInvoiceCreate = (invoice: Invoice) => {
    setShowInvoiceForm(false);
  };

  if (!clientId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <Euro className="h-12 w-12 mx-auto opacity-50" />
          <h3 className="text-lg font-medium">Aucun patient sélectionné</h3>
          <p className="text-sm">Sélectionnez un patient pour gérer sa facturation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Colonne gauche : Liste des factures */}
      <div className="w-80 border-r border-border bg-muted/30 p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Factures</h3>
            <Button
              onClick={() => setShowInvoiceForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2">
              {clientInvoices.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedInvoice?.id === invoice.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{invoice.number}</span>
                      <Badge 
                        variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'sent' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {invoice.status === 'paid' ? 'Payée' :
                         invoice.status === 'sent' ? 'Envoyée' :
                         'Brouillon'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()}
                    </div>
                    <div className="font-semibold">
                      CHF {invoice.total.toFixed(2)}
                    </div>
                  </div>
                </Card>
              ))}
              
              {clientInvoices.length === 0 && (
                <div className="text-center py-8">
                  <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune facture pour ce patient
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Colonne droite : Formulaire ou prévisualisation */}
      <div className="flex-1 overflow-hidden">
        {showInvoiceForm ? (
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nouvelle facture</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceForm(false)}
                >
                  Annuler
                </Button>
              </div>
              
              <InvoiceForm onInvoiceCreate={handleInvoiceCreate} />
            </div>
          </ScrollArea>
        ) : selectedInvoice ? (
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Aperçu de la facture</h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Fermer
                </Button>
              </div>
              
              <InvoicePreview 
                invoice={{
                  id: selectedInvoice.id || '',
                  number: selectedInvoice.number,
                  date: selectedInvoice.date,
                  dueDate: selectedInvoice.due_date,
                  clientName: selectedInvoice.clientName,
                  clientAddress: selectedInvoice.clientAddress,
                  clientNPA: selectedInvoice.clientNPA,
                  clientCity: selectedInvoice.clientCity,
                  items: selectedInvoice.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    price: item.unit_price,
                    total: item.total
                  })),
                  total: selectedInvoice.subtotal,
                  tva: selectedInvoice.tva_amount,
                  totalWithTva: selectedInvoice.total,
                  notes: selectedInvoice.notes || '',
                  status: selectedInvoice.status
                }}
                onInvoiceStatusUpdate={(invoice, status) => {
                  // Update the selected invoice status
                  if (selectedInvoice) {
                    setSelectedInvoice({ ...selectedInvoice, status });
                  }
                }}
              />
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="text-4xl">💰</div>
              <h3 className="text-lg font-medium">Gestion des factures</h3>
              <p className="text-sm">Créez une nouvelle facture ou sélectionnez-en une dans la liste</p>
              <Button onClick={() => setShowInvoiceForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer une facture
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};