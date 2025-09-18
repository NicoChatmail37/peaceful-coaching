import { useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useInvoices } from "@/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Clock, Euro, Plus } from "lucide-react";

interface BillingTabProps {
  clientId: string;
}

export const BillingTab = ({ clientId }: BillingTabProps) => {
  const { sessions } = useSessions(clientId);
  const { invoices } = useInvoices();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const unbilledSessions = sessions.filter(s => 
    s.status === 'done' && !s.invoice_id
  );

  const clientInvoices = invoices.filter(inv => inv.client_id === clientId);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleCreateInvoice = () => {
    if (selectedSessions.length === 0) return;
    
    // TODO: Implémenter la création de facture
    console.log('Créer facture pour les séances:', selectedSessions);
    setSelectedSessions([]);
  };

  const totalAmount = selectedSessions.length * 120; // Prix par défaut de 120 CHF

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Séances à facturer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Séances à facturer ({unbilledSessions.length})
              </span>
              {selectedSessions.length > 0 && (
                <Button onClick={handleCreateInvoice}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer facture ({totalAmount} CHF)
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unbilledSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune séance à facturer</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unbilledSessions.map((session) => (
                  <div key={session.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={() => handleSessionToggle(session.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">
                        {session.title || 'Séance sans titre'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">120,00 CHF</p>
                      <p className="text-xs text-muted-foreground">Prix par défaut</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Factures du client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Factures du client ({clientInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune facture émise</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        Facture {invoice.number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(invoice.date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium text-sm">
                        {invoice.total.toFixed(2)} CHF
                      </p>
                      <Badge variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'sent' ? 'secondary' : 'outline'
                      }>
                        {invoice.status === 'paid' ? 'Payée' : 
                         invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé financier */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé financier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-success">
                  {clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">CHF encaissés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {clientInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">CHF en attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {(unbilledSessions.length * 120).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">CHF à facturer</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};