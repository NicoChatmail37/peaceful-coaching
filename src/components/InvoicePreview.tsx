import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Invoice, CompanyInfo } from "@/pages/Index";
import { QRBill } from "@/components/QRBill";
import { AccountingExport } from "@/components/AccountingExport";
import { Download, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoicePreviewProps {
  invoice: Invoice;
  companyInfo: CompanyInfo;
}

export const InvoicePreview = ({ invoice, companyInfo }: InvoicePreviewProps) => {
  const { toast } = useToast();

  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "Fonctionnalité d'export PDF à venir. Utilisez l'impression du navigateur pour l'instant.",
    });
  };

  const handleSendEmail = () => {
    toast({
      title: "Envoi par email",
      description: "Fonctionnalité d'envoi par email à venir.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Facture {invoice.number}</h2>
          <p className="text-muted-foreground">
            Créée le {new Date(invoice.date).toLocaleDateString('fr-CH')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendEmail}>
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Eye className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="invoice-preview">
            <CardContent className="p-8 space-y-8">
              {/* En-tête de facture */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">FACTURE</h1>
                  <p className="text-sm text-muted-foreground">
                    N° {invoice.number}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-foreground">
                    {companyInfo.name}
                  </h2>
                  <div className="text-sm text-muted-foreground mt-2">
                    <p>{companyInfo.address}</p>
                    <p>{companyInfo.npa} {companyInfo.city}</p>
                    <p>{companyInfo.phone}</p>
                    <p>{companyInfo.email}</p>
                    {companyInfo.tvaNumber && (
                      <p>TVA: {companyInfo.tvaNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Informations client et dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Facturé à:</h3>
                  <div className="text-sm">
                    <p className="font-medium">{invoice.clientName}</p>
                    <p>{invoice.clientAddress}</p>
                    <p>{invoice.clientNPA} {invoice.clientCity}</p>
                  </div>
                </div>
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date de facture:</span>
                      <span>{new Date(invoice.date).toLocaleDateString('fr-CH')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Échéance:</span>
                      <span>{new Date(invoice.dueDate).toLocaleDateString('fr-CH')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Articles */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Détail des prestations:</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-2">Description</div>
                    <div className="text-center">Qté</div>
                    <div className="text-right">Prix unit.</div>
                    <div className="text-right">Total</div>
                  </div>
                  
                  {invoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 text-sm py-2">
                      <div className="col-span-2">{item.description}</div>
                      <div className="text-center">{item.quantity}</div>
                      <div className="text-right">CHF {item.price.toFixed(2)}</div>
                      <div className="text-right font-medium">CHF {item.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totaux */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total:</span>
                    <span>CHF {invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>TVA 7.7%:</span>
                    <span>CHF {invoice.tva.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>CHF {invoice.totalWithTva.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Remarques */}
              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Remarques:</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* QR-Bill */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📱 QR-Facture Suisse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRBill invoice={invoice} companyInfo={companyInfo} />
            </CardContent>
          </Card>
        </div>

        {/* Panneau latéral - Export comptabilité */}
        <div className="space-y-6">
          <AccountingExport invoice={invoice} />
        </div>
      </div>

      <style>{`
        @media print {
          .invoice-preview {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};