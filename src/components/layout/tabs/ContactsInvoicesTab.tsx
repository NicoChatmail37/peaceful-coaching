import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Receipt, Trash2, X, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClients } from "@/hooks/useClients";
import { useInvoices, FullInvoice } from "@/hooks/useInvoices";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoicePreview } from "@/components/InvoicePreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ContactsInvoicesTab = () => {
  const { clients, loading: clientsLoading } = useClients();
  const { invoices, loading: invoicesLoading, deleteInvoices, updateInvoiceStatus } = useInvoices();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<FullInvoice | null>(null);

  // Filter clients by search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get selected client
  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

  const handleDeleteInvoice = async (invoiceId: string) => {
    await deleteInvoices([invoiceId]);
  };

  // Filter invoices - show all by default, filter by client if selected
  const displayedInvoices = selectedClient 
    ? invoices.filter(invoice => {
        // Match by client_id for accurate filtering
        const matchesClient = invoice.client_id === selectedClient.id;
        
        if (invoiceFilter === 'all') return matchesClient;
        if (invoiceFilter === 'pending') return matchesClient && invoice.status !== 'paid';
        if (invoiceFilter === 'paid') return matchesClient && invoice.status === 'paid';
        
        return matchesClient;
      })
    : invoices.filter(invoice => {
        // Show all invoices when no client is selected, filtered by status
        if (invoiceFilter === 'all') return true;
        if (invoiceFilter === 'pending') return invoice.status !== 'paid';
        if (invoiceFilter === 'paid') return invoice.status === 'paid';
        
        return true;
      });

  return (
    <div className="h-full flex">
      {/* Colonne gauche : Liste des clients */}
      <div className="w-80 border-r border-border bg-muted/30 p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Clients list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clients ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedClientId === client.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <div className="font-medium text-sm">{client.name}</div>
                      {client.email && (
                        <div className="text-xs text-muted-foreground">{client.email}</div>
                      )}
                      {client.city && (
                        <div className="text-xs text-muted-foreground">{client.city}</div>
                      )}
                    </div>
                  ))}
                  
                  {filteredClients.length === 0 && !clientsLoading && (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Colonne droite : Toutes les factures ou factures du client sélectionné */}
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Header avec info client ou titre général */}
          {selectedClient ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedClient.name}</h2>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {selectedClient.email && <div>📧 {selectedClient.email}</div>}
                      {selectedClient.phone && <div>📞 {selectedClient.phone}</div>}
                      {selectedClient.address && (
                        <div>📍 {selectedClient.address}, {selectedClient.npa} {selectedClient.city}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {displayedInvoices.length} facture{displayedInvoices.length > 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClientId(null)}
                    >
                      Voir toutes les factures
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Toutes les factures</h2>
                    <div className="text-sm text-muted-foreground">
                      Vue d'ensemble de toutes les factures
                    </div>
                  </div>
                  <Badge variant="outline">
                    {displayedInvoices.length} facture{displayedInvoices.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Factures {selectedClient ? `de ${selectedClient.name}` : ''}
                </CardTitle>
                
                <Tabs value={invoiceFilter} onValueChange={(value) => setInvoiceFilter(value as typeof invoiceFilter)}>
                  <TabsList>
                    <TabsTrigger value="all">Toutes</TabsTrigger>
                    <TabsTrigger value="pending">En cours</TabsTrigger>
                    <TabsTrigger value="paid">Acquittées</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {displayedInvoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedInvoice?.id === invoice.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invoice.number}</span>
                          {!selectedClient && (
                            <span className="text-sm text-muted-foreground">• {invoice.clientName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteInvoice(invoice.id!)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                      <div className="font-semibold text-lg">
                        CHF {invoice.total.toFixed(2)}
                      </div>
                      {invoice.notes && (
                        <div className="text-sm text-muted-foreground mt-2 line-clamp-1">
                          {invoice.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {displayedInvoices.length === 0 && !invoicesLoading && (
                    <div className="text-center py-8">
                      <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {selectedClient ? (
                          invoiceFilter === 'all' ? 'Aucune facture pour ce client' :
                          invoiceFilter === 'pending' ? 'Aucune facture en cours pour ce client' :
                          'Aucune facture acquittée pour ce client'
                        ) : (
                          invoiceFilter === 'all' ? 'Aucune facture' :
                          invoiceFilter === 'pending' ? 'Aucune facture en cours' :
                          'Aucune facture acquittée'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Panneau de prévisualisation de la facture */}
      {selectedInvoice && (
        <div className="w-[600px] border-l border-border bg-background p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Aperçu facture {selectedInvoice.number}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedInvoice(null)}
            >
              <X className="h-4 w-4" />
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
              updateInvoiceStatus(selectedInvoice.id!, status);
              setSelectedInvoice({ ...selectedInvoice, status });
            }}
          />
        </div>
      )}
    </div>
  );
};