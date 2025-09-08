import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Invoice } from "@/pages/Index";
import { Eye, FileText, CheckCircle, Clock, Trash2, Download, Send, Zap } from "lucide-react";
import { useInvoices, FullInvoice } from "@/hooks/useInvoices";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceListProps {
  invoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
}

// Utility function to convert Supabase invoice to local Invoice format
const convertSupabaseToLocal = (supabaseInvoice: FullInvoice): Invoice => {
  return {
    id: supabaseInvoice.id || '',
    number: supabaseInvoice.number,
    date: supabaseInvoice.date,
    dueDate: supabaseInvoice.due_date,
    clientName: supabaseInvoice.clientName,
    clientAddress: supabaseInvoice.clientAddress,
    clientNPA: supabaseInvoice.clientNPA,
    clientCity: supabaseInvoice.clientCity,
    items: supabaseInvoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      price: item.unit_price,
      total: item.total
    })),
    total: supabaseInvoice.subtotal,
    tva: supabaseInvoice.tva_amount,
    totalWithTva: supabaseInvoice.total,
    notes: supabaseInvoice.notes,
    status: supabaseInvoice.status
  };
};

export const InvoiceList = ({ invoices, onInvoiceSelect }: InvoiceListProps) => {
  const { invoices: supabaseInvoices, loading, updateInvoiceStatus, deleteInvoices } = useInvoices();
  const { toast } = useToast();
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState("json");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Use Supabase invoices if available, fallback to local invoices
  const displayInvoices = supabaseInvoices.length > 0 
    ? supabaseInvoices.map(convertSupabaseToLocal)
    : invoices;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold mb-2">Chargement...</h3>
          <p className="text-muted-foreground">
            Chargement des factures en cours...
          </p>
        </CardContent>
      </Card>
    );
  }
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

  if (displayInvoices.length === 0) {
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

  const totalAmount = displayInvoices.reduce((sum, invoice) => sum + invoice.totalWithTva, 0);
  const paidInvoices = displayInvoices.filter(inv => inv.status === 'paid');
  const pendingInvoices = displayInvoices.filter(inv => inv.status !== 'paid');

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(displayInvoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner des factures à supprimer",
        variant: "destructive"
      });
      return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedInvoices.length} facture(s) ?`)) {
      return;
    }

    const success = await deleteInvoices(selectedInvoices);
    if (success) {
      setSelectedInvoices([]);
    }
  };

  const generateAccountingData = (invoice: Invoice) => {
    return {
      invoice_number: invoice.number,
      date: invoice.date,
      client_name: invoice.clientName,
      total_ht: invoice.total,
      tva_amount: invoice.tva,
      total_ttc: invoice.totalWithTva,
      currency: "CHF",
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.total
      })),
      accounting_entries: [
        {
          account: "1100",
          debit: invoice.totalWithTva,
          credit: 0,
          description: `Facture ${invoice.number} - ${invoice.clientName}`
        },
        {
          account: "3000",
          debit: 0,
          credit: invoice.total,
          description: `Vente facture ${invoice.number}`
        },
        {
          account: "2200",
          debit: 0,
          credit: invoice.tva,
          description: `TVA 7.7% facture ${invoice.number}`
        }
      ]
    };
  };

  const handleBulkExport = () => {
    if (selectedInvoices.length === 0) return;

    const selectedData = displayInvoices
      .filter(inv => selectedInvoices.includes(inv.id))
      .map(invoice => generateAccountingData(invoice));

    let content = "";
    let filename = `factures_export`;

    switch (exportFormat) {
      case "json":
        content = JSON.stringify(selectedData, null, 2);
        filename += ".json";
        break;
      case "csv":
        const headers = "Facture,Compte,Débit,Crédit,Description\n";
        const rows = selectedData.flatMap(data => 
          data.accounting_entries.map(entry => 
            `${data.invoice_number},${entry.account},${entry.debit},${entry.credit},"${entry.description}"`
          )
        ).join("\n");
        content = headers + rows;
        filename += ".csv";
        break;
      case "xml":
        content = `<?xml version="1.0" encoding="UTF-8"?>
<invoices>
${selectedData.map(data => `  <invoice>
    <number>${data.invoice_number}</number>
    <date>${data.date}</date>
    <client>${data.client_name}</client>
    <total_ht>${data.total_ht}</total_ht>
    <tva>${data.tva_amount}</tva>
    <total_ttc>${data.total_ttc}</total_ttc>
    <entries>
      ${data.accounting_entries.map(entry => 
        `<entry account="${entry.account}" debit="${entry.debit}" credit="${entry.credit}">${entry.description}</entry>`
      ).join('\n      ')}
    </entries>
  </invoice>`).join('\n')}
</invoices>`;
        filename += ".xml";
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Mark invoices as exported
    selectedInvoices.forEach(async (invoiceId) => {
      // Note: Would need updateInvoiceExported function in useInvoices hook
    });

    toast({
      title: "Export réussi !",
      description: `${selectedInvoices.length} facture(s) exportée(s) en ${exportFormat.toUpperCase()}`
    });
    setSelectedInvoices([]);
  };

  const handleZapierSend = async () => {
    if (!webhookUrl || selectedInvoices.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer l'URL Zapier et sélectionner des factures",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const selectedData = displayInvoices
      .filter(inv => selectedInvoices.includes(inv.id))
      .map(invoice => generateAccountingData(invoice));

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          invoices: selectedData,
          timestamp: new Date().toISOString(),
          source: "SwissInvoice"
        }),
      });

      toast({
        title: "Données envoyées !",
        description: `${selectedInvoices.length} facture(s) envoyée(s) vers Zapier`
      });
      setSelectedInvoices([]);
    } catch (error) {
      toast({
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer les données vers Zapier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{displayInvoices.length}</div>
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

      {/* Barre d'actions toujours visible */}
      <Card className={selectedInvoices.length > 0 ? "border-primary/20 bg-primary/5" : ""}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="text-sm">
              {selectedInvoices.length > 0 ? (
                <span><span className="font-medium">{selectedInvoices.length}</span> facture(s) sélectionnée(s)</span>
              ) : (
                <span>Sélectionnez des factures pour les actions groupées</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant={selectedInvoices.length > 0 ? "destructive" : "outline"}
                size="sm" 
                onClick={handleBulkDelete}
                disabled={selectedInvoices.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedInvoices.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkExport}
                disabled={selectedInvoices.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter ({selectedInvoices.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="space-y-4">
            {/* En-tête avec sélection globale */}
            <div className="flex items-center gap-3 pb-2 border-b">
              <Checkbox
                checked={selectedInvoices.length === displayInvoices.length && displayInvoices.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Sélectionner tout</span>
            </div>

            <div className="space-y-3">
              {displayInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedInvoices.includes(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {invoice.number}
                        </h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">{getStatusLabel(invoice.status)}</span>
                        </Badge>
                        {/* Note: exported status would be shown here when implemented */}
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
          </div>
        </CardContent>
      </Card>

      {/* Options d'export et Zapier en bas de page */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Export comptabilité
            </CardTitle>
            <CardDescription>
              Exportez les données vers votre logiciel de comptabilité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Format d'export</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Sélectionnez des factures ci-dessus puis cliquez sur "Exporter"
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Zapier Integration
            </CardTitle>
            <CardDescription>
              Envoyez automatiquement vers Bexio, AbaClik ou autre via Zapier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">URL du webhook Zapier</Label>
              <Input
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>

            <Button 
              onClick={handleZapierSend} 
              disabled={isLoading || !webhookUrl || selectedInvoices.length === 0}
              size="sm"
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? "Envoi..." : "Envoyer vers Zapier"}
            </Button>

            <div className="text-xs text-muted-foreground">
              <p className="mb-2">💡 Pour connecter Zapier :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Créez un Zap avec un trigger "Webhooks by Zapier"</li>
                <li>Copiez l'URL du webhook</li>
                <li>Connectez à Bexio, AbaClik ou votre logiciel comptable</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};