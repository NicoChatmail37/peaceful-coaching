import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Receipt, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClients } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ContactsInvoicesTab = () => {
  const { clients, loading: clientsLoading } = useClients();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Filter clients by search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get selected client
  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

  // Filter invoices for selected client
  const clientInvoices = selectedClient 
    ? invoices.filter(invoice => {
        // For now, match by client name since we don't have direct client_id relation
        const matchesClient = invoice.clientName === selectedClient.name;
        
        if (invoiceFilter === 'all') return matchesClient;
        if (invoiceFilter === 'pending') return matchesClient && invoice.status !== 'paid';
        if (invoiceFilter === 'paid') return matchesClient && invoice.status === 'paid';
        
        return matchesClient;
      })
    : [];

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

      {/* Colonne droite : Factures du client sélectionné */}
      <div className="flex-1 p-6">
        {selectedClient ? (
          <div className="space-y-6">
            {/* Client info */}
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
                  <Badge variant="outline">
                    {clientInvoices.length} facture{clientInvoices.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Factures
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
                    {clientInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{invoice.number}</span>
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
                        <div className="text-sm text-muted-foreground mb-2">
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                        <div className="font-semibold text-lg">
                          CHF {invoice.total.toFixed(2)}
                        </div>
                        {invoice.notes && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {invoice.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {clientInvoices.length === 0 && (
                      <div className="text-center py-8">
                        <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {invoiceFilter === 'all' ? 'Aucune facture' :
                           invoiceFilter === 'pending' ? 'Aucune facture en cours' :
                           'Aucune facture acquittée'}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 mx-auto opacity-50" />
              <h3 className="text-lg font-medium">Sélectionnez un client</h3>
              <p className="text-sm">Choisissez un client dans la liste pour voir ses factures</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};