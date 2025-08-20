import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/pages/Index";
import { Eye, FileText, CheckCircle, Clock } from "lucide-react";

interface InvoiceListProps {
  invoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
}

export const InvoiceList = ({ invoices, onInvoiceSelect }: InvoiceListProps) => {
  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'sent':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-3 h-3" />;
      case 'sent':
        return <Clock className="w-3 h-3" />;
      case 'paid':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'sent':
        return 'Envoyée';
      case 'paid':
        return 'Payée';
      default:
        return status;
    }
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">Aucune facture</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore créé de factures. Utilisez l'onglet "Créer" pour en faire une.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalWithTva, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{invoices.length}</div>
            <div className="text-sm text-muted-foreground">Total factures</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{paidInvoices.length}</div>
            <div className="text-sm text-muted-foreground">Payées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{pendingInvoices.length}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">CHF {totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Montant total</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Liste des factures
          </CardTitle>
          <CardDescription>
            Gérez et consultez toutes vos factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">
                        {invoice.number}
                      </h3>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{getStatusLabel(invoice.status)}</span>
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">{invoice.clientName}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(invoice.date).toLocaleDateString('fr-CH')}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="font-semibold text-foreground">
                        CHF {invoice.totalWithTva.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInvoiceSelect(invoice)}
                    className="ml-4"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};