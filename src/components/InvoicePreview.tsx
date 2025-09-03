import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Invoice } from "@/pages/Index";
import { QRBill } from "@/components/QRBill";
import { AccountingExport } from "@/components/AccountingExport";
import { Download, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useInvoices, FullInvoice } from "@/hooks/useInvoices";

interface InvoicePreviewProps {
  invoice: Invoice;
  onInvoiceStatusUpdate?: (invoice: Invoice, status: 'draft' | 'sent' | 'paid') => void;
}

export const InvoicePreview = ({ invoice, onInvoiceStatusUpdate }: InvoicePreviewProps) => {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const { updateInvoiceStatus } = useInvoices();

  const handleExportPDF = async () => {
    try {
      const element = document.querySelector('.invoice-preview') as HTMLElement;
      if (!element) {
        throw new Error('Invoice element not found');
      }

      // Temporarily hide the print:hidden elements
      const hiddenElements = document.querySelectorAll('.print\\:hidden');
      hiddenElements.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Restore hidden elements
      hiddenElements.forEach(el => (el as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If content is too tall, fit to page height
      if (imgHeight > pdfHeight) {
        const ratio = pdfHeight / imgHeight;
        const finalWidth = imgWidth * ratio;
        const finalHeight = pdfHeight;
        pdf.addImage(imgData, 'PNG', (pdfWidth - finalWidth) / 2, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`facture-${invoice.number}.pdf`);
      
      // Update status to sent if it was draft
      if (invoice.status === 'draft') {
        await updateInvoiceStatus(invoice.id, 'sent');
        onInvoiceStatusUpdate?.(invoice, 'sent');
      }

      toast({
        title: "PDF généré",
        description: `La facture ${invoice.number} a été exportée en PDF.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF. Utilisez l'impression du navigateur.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = async () => {
    try {
      // First generate PDF (this will also update status to 'sent')
      await handleExportPDF();
      
      // Here you could add email sending functionality
      toast({
        title: "Prêt à envoyer",
        description: "Le PDF a été généré. Fonctionnalité d'envoi email à venir.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la préparation de l'envoi.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center print:hidden">
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

      {/* Layout A4 officiel suisse */}
      <div className="max-w-none">
        {/* Page principale de facture */}
        <Card className="invoice-preview max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:border-none">
          <CardContent className="p-12 space-y-8" style={{ minHeight: '297mm' }}>
            {/* En-tête avec informations entreprise et client */}
            <div className="flex justify-between items-start mb-16">
              {/* Informations entreprise */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground uppercase">
                  {activeCompany?.name}
                </h2>
                <div className="text-sm text-muted-foreground">
                  <p>{activeCompany?.address}</p>
                  <p>{activeCompany?.npa} {activeCompany?.city}</p>
                  <p>Tél: {activeCompany?.phone}</p>
                  <p>{activeCompany?.email}</p>
                  {activeCompany?.tva_number && (
                    <p>N° TVA: {activeCompany?.tva_number}</p>
                  )}
                </div>
              </div>

              {/* Adresse client et informations facture */}
              <div className="text-right space-y-6">
                <div>
                  <p className="text-sm font-medium">Monsieur</p>
                  <p className="text-sm font-medium">{invoice.clientName}</p>
                  <p className="text-sm">{invoice.clientAddress}</p>
                  <p className="text-sm">{invoice.clientNPA} {invoice.clientCity}</p>
                </div>
                
                <div className="text-sm space-y-1">
                  <p>N° d'affilié/IDE: <span className="font-medium">{invoice.number}</span></p>
                  <p>N° AVS: 756.4750.1669.33</p>
                  <p>{activeCompany?.city}, le {new Date(invoice.date).toLocaleDateString('fr-CH')}</p>
                </div>
              </div>
            </div>

            {/* Titre et référence */}
            <div className="mb-8">
              <h1 className="text-lg font-bold mb-2">{new Date().getFullYear()}54{String(new Date().getMonth() + 1).padStart(2, '0')}000 Décompte de cotisations 1er trimestre {new Date().getFullYear()}</h1>
              <p className="text-sm text-muted-foreground">36096-1200</p>
            </div>

            {/* Tableau des prestations */}
            <div className="mb-16">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-xs font-medium">LIBELLÉ</th>
                    <th className="text-center py-3 px-2 text-xs font-medium">PÉRIODE</th>
                    <th className="text-right py-3 px-2 text-xs font-medium">BASE OU<br/>MONTANT DU</th>
                    <th className="text-right py-3 px-2 text-xs font-medium">DÉJÀ FACTURÉ</th>
                    <th className="text-right py-3 px-2 text-xs font-medium">BASE</th>
                    <th className="text-right py-3 px-2 text-xs font-medium">TAUX</th>
                    <th className="text-right py-3 px-2 text-xs font-medium">MONTANT</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 px-2 text-xs">{item.description}</td>
                      <td className="py-2 px-2 text-xs text-center">{new Date(invoice.date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td className="py-2 px-2 text-xs text-right">{item.price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-xs text-right">-</td>
                      <td className="py-2 px-2 text-xs text-right">{item.price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-xs text-right">{item.quantity.toFixed(2)}</td>
                      <td className="py-2 px-2 text-xs text-right font-medium">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total en notre faveur */}
            <div className="mb-16 flex justify-end">
              <div className="text-right">
                <div className="border-2 border-gray-800 p-4 min-w-96">
                  <p className="text-sm font-bold mb-2">
                    TOTAL EN NOTRE FAVEUR / DOIT ÊTRE EN NOTRE POSSESSION LE {new Date(invoice.dueDate).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
                  </p>
                  <p className="text-2xl font-bold">{invoice.totalWithTva.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Ligne de séparation pour la section QR */}
            <div className="border-t border-dashed border-gray-400 pt-8 mt-auto">
              {/* QR-Bill en bas de page dans sa position officielle */}
              <QRBill invoice={invoice} />
            </div>
          </CardContent>
        </Card>

        {/* Panneau latéral - Export comptabilité (affiché uniquement à l'écran) */}
        <div className="mt-6 print:hidden">
          <AccountingExport invoice={invoice} />
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .invoice-preview {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};