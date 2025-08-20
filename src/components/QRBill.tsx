import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Invoice, CompanyInfo } from "@/pages/Index";

interface QRBillProps {
  invoice: Invoice;
  companyInfo: CompanyInfo;
}

export const QRBill = ({ invoice, companyInfo }: QRBillProps) => {
  // Génération du QR code (pour une vraie implémentation, utiliser une librairie comme qrcode)
  const generateQRData = () => {
    const qrData = [
      "SPC", // QR-Type
      "0200", // Version
      "1", // Coding Type
      companyInfo.iban.replace(/\s/g, ''), // IBAN
      "K", // Creditor Address Type (K = structured)
      companyInfo.name.substring(0, 70),
      companyInfo.address.substring(0, 70),
      companyInfo.npa,
      companyInfo.city.substring(0, 35),
      "CH", // Country
      "", // Ultimate Creditor Address Type
      "", // Ultimate Creditor Name
      "", // Ultimate Creditor Address
      "", // Ultimate Creditor Postal Code
      "", // Ultimate Creditor City
      "", // Ultimate Creditor Country
      invoice.totalWithTva.toFixed(2), // Amount
      "CHF", // Currency
      "K", // Debtor Address Type
      invoice.clientName.substring(0, 70),
      invoice.clientAddress.substring(0, 70),
      invoice.clientNPA,
      invoice.clientCity.substring(0, 35),
      "CH", // Debtor Country
      "", // Payment Reference Type
      "", // Payment Reference
      invoice.notes?.substring(0, 140) || `Facture ${invoice.number}`, // Additional Information
      "EPD", // Alternative Procedure
      "" // Alternative Procedure Parameters
    ].join('\r\n');

    return qrData;
  };

  const formatIBAN = (iban: string) => {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <div className="border-2 border-dashed border-muted-foreground/20 p-6 bg-muted/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section de réception */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Section de réception</h3>
          
          <div className="text-xs space-y-1">
            <div className="font-medium">Compte / Payable à</div>
            <div>{formatIBAN(companyInfo.iban)}</div>
            <div>{companyInfo.name}</div>
            <div>{companyInfo.address}</div>
            <div>{companyInfo.npa} {companyInfo.city}</div>
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium">Payable par</div>
            <div>{invoice.clientName}</div>
            <div>{invoice.clientAddress}</div>
            <div>{invoice.clientNPA} {invoice.clientCity}</div>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-xs">
              <div className="font-medium">Monnaie</div>
              <div>CHF</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium">Montant</div>
              <div className="text-lg font-bold">{invoice.totalWithTva.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Section de paiement avec QR Code */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Section de paiement</h3>
          
          {/* QR Code placeholder - En production, utiliser une vraie librairie QR */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center text-background font-mono text-xs">
              QR-CODE
              <br />
              (Simulation)
            </div>
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium">Compte / Payable à</div>
            <div>{formatIBAN(companyInfo.iban)}</div>
            <div>{companyInfo.name}</div>
            <div>{companyInfo.address}</div>
            <div>{companyInfo.npa} {companyInfo.city}</div>
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium">Informations supplémentaires</div>
            <div>{invoice.notes || `Facture ${invoice.number}`}</div>
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium">Payable par</div>
            <div>{invoice.clientName}</div>
            <div>{invoice.clientAddress}</div>
            <div>{invoice.clientNPA} {invoice.clientCity}</div>
          </div>

          <div className="flex justify-between items-end">
            <div className="text-xs">
              <div className="font-medium">Monnaie</div>
              <div>CHF</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium">Montant</div>
              <div className="text-lg font-bold">{invoice.totalWithTva.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center">
        ⚠️ QR-Code de démonstration - En production, un vrai QR-Code serait généré selon les standards Swiss QR-bill
      </div>
    </div>
  );
};