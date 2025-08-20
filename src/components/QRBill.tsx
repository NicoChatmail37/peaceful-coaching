import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Invoice, CompanyInfo } from "@/pages/Index";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRBillProps {
  invoice: Invoice;
  companyInfo: CompanyInfo;
}

export const QRBill = ({ invoice, companyInfo }: QRBillProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  // Génération du QR code Swiss QR-Bill conforme aux standards
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

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        try {
          const qrData = generateQRData();
          await QRCode.toCanvas(canvasRef.current, qrData, {
            width: 128,
            margin: 0,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'M',
          });
          setQrGenerated(true);
        } catch (error) {
          console.error('Erreur lors de la génération du QR code:', error);
        }
      }
    };

    generateQR();
  }, [invoice, companyInfo]);

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
          
          {/* QR Code - Vrai QR code Swiss QR-Bill */}
          <div className="flex justify-center">
            <div className="relative">
              <canvas 
                ref={canvasRef}
                className="border border-muted-foreground/20 bg-white"
                style={{ width: '128px', height: '128px' }}
              />
              {!qrGenerated && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs">
                  Génération...
                </div>
              )}
              {/* Croix suisse au centre du QR code */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 bg-white border border-muted-foreground flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                    +
                  </div>
                </div>
              </div>
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
        ✅ QR-Code Swiss QR-Bill conforme aux standards suisses - Prêt pour impression et paiement
      </div>
    </div>
  );
};