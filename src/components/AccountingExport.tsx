import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Invoice } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { Send, Download, Zap } from "lucide-react";

interface AccountingExportProps {
  invoice: Invoice;
}

export const AccountingExport = ({ invoice }: AccountingExportProps) => {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("json");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateAccountingData = () => {
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
          account: "1100", // Clients
          debit: invoice.totalWithTva,
          credit: 0,
          description: `Facture ${invoice.number} - ${invoice.clientName}`
        },
        {
          account: "3000", // Ventes
          debit: 0,
          credit: invoice.total,
          description: `Vente facture ${invoice.number}`
        },
        {
          account: "2200", // TVA due
          debit: 0,
          credit: invoice.tva,
          description: `TVA 7.7% facture ${invoice.number}`
        }
      ]
    };
  };

  const handleExportFile = () => {
    const data = generateAccountingData();
    let content = "";
    let filename = `facture_${invoice.number}`;

    switch (exportFormat) {
      case "json":
        content = JSON.stringify(data, null, 2);
        filename += ".json";
        break;
      case "csv":
        const headers = "Compte,Débit,Crédit,Description\n";
        const rows = data.accounting_entries
          .map(entry => `${entry.account},${entry.debit},${entry.credit},"${entry.description}"`)
          .join("\n");
        content = headers + rows;
        filename += ".csv";
        break;
      case "xml":
        content = `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
  <number>${data.invoice_number}</number>
  <date>${data.date}</date>
  <client>${data.client_name}</client>
  <total_ht>${data.total_ht}</total_ht>
  <tva>${data.tva_amount}</tva>
  <total_ttc>${data.total_ttc}</total_ttc>
  <entries>
    ${data.accounting_entries.map(entry => 
      `<entry account="${entry.account}" debit="${entry.debit}" credit="${entry.credit}">${entry.description}</entry>`
    ).join('\n    ')}
  </entries>
</invoice>`;
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

    toast({
      title: "Export réussi !",
      description: `Données comptables exportées en ${exportFormat.toUpperCase()}`
    });
  };

  const handleWebhookSend = async () => {
    if (!webhookUrl) {
      toast({
        title: "URL manquante",
        description: "Veuillez entrer l'URL de votre webhook Zapier",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const data = generateAccountingData();

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: "Peaceful Coaching"
        }),
      });

      toast({
        title: "Données envoyées !",
        description: "Les données comptables ont été envoyées vers Zapier. Vérifiez l'historique de votre Zap."
      });
    } catch (error) {
      toast({
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer les données. Vérifiez l'URL du webhook.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

          <Button onClick={handleExportFile} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Télécharger les données
          </Button>
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
            onClick={handleWebhookSend} 
            disabled={isLoading || !webhookUrl}
            className="w-full bg-gradient-primary hover:bg-primary/90"
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

      <Card>
        <CardHeader>
          <CardTitle>📋 Aperçu des écritures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-2">
            <div className="grid grid-cols-4 gap-2 font-semibold border-b pb-1">
              <div>Compte</div>
              <div>Débit</div>
              <div>Crédit</div>
              <div>Description</div>
            </div>
            {generateAccountingData().accounting_entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 py-1">
                <div className="font-mono">{entry.account}</div>
                <div>{entry.debit > 0 ? `CHF ${entry.debit.toFixed(2)}` : "-"}</div>
                <div>{entry.credit > 0 ? `CHF ${entry.credit.toFixed(2)}` : "-"}</div>
                <div className="text-muted-foreground truncate">{entry.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};