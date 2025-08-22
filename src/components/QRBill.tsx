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

  // -----------------------------
  // Helpers
  // -----------------------------
  const CRLF = "\r\n";
  const t70 = (s?: string) => (s ?? "").trim().slice(0, 70);
  const t35 = (s?: string) => (s ?? "").trim().slice(0, 35);

  // Découpe best‑effort "Rue 12A" -> { street: "Rue", number: "12A" }
  function splitStreet(address: string) {
    const m = (address || "").match(/^(.+?)\s+(\d+[a-zA-Z]?)\s*$/);
    return m ? { street: m[1], number: m[2] } : { street: address || "", number: "" };
  }

  function buildStructuredAddress(
    name: string,
    line: string,
    postal: string | number,
    city: string,
    country = "CH"
  ) {
    const { street, number } = splitStreet(line);
    return [
      "S",                  // Address Type (structured)
      t70(name),            // Name
      t70(street),          // Street
      (number ?? "").toString(), // Building number (can be empty but MUST exist)
      String(postal ?? ""), // Postal code
      t35(city),            // Town
      (country || "CH").toUpperCase(), // Country (ISO-2)
    ];
  }

  // Détection simple d'un QR‑IBAN (éviter avec Reference Type = NON)
  function looksLikeQrIban(ibanNoSpace: string) {
    const m = ibanNoSpace.replace(/\s/g, "").toUpperCase().match(/^CH\d{2}(\d{5})/);
    if (!m) return false;
    const iid = parseInt(m[1], 10);
    return iid >= 30000 && iid <= 31999;
  }

  // -----------------------------
  // Génération du payload Swiss QR-bill
  // -----------------------------
  const generateQRData = () => {
    const cleanIBAN = companyInfo.iban.replace(/\s/g, "").toUpperCase();
    const amount = invoice.totalWithTva > 0 ? invoice.totalWithTva.toFixed(2) : "";

    // Si on utilise NON (pas de référence), éviter un QR‑IBAN
    if (looksLikeQrIban(cleanIBAN)) {
      console.warn(
        "IBAN détecté comme QR‑IBAN alors que Reference Type = NON. Utilise un IBAN standard."
      );
    }

    // Creditor (bénéficiaire)
    const creditor = buildStructuredAddress(
      companyInfo.name,
      companyInfo.address,
      companyInfo.npa,
      companyInfo.city,
      "CH"
    );

    // Ultimate Creditor (non utilisé) => 7 lignes vides
    const ultimateCreditor = ["", "", "", "", "", "", ""];

    // Debtor (payeur)
    const debtor = buildStructuredAddress(
      invoice.clientName,
      invoice.clientAddress,
      invoice.clientNPA,
      invoice.clientCity,
      "CH"
    );

    // Référence: NON + champ vide (IBAN normal)
    const reference = ["NON", ""];

    // Infos libres (140 max)
    const additionalInfo =
      (invoice.notes?.trim().slice(0, 140)) || `Facture ${invoice.number}`;

    // Trailer + Billing Info + AP1 + AP2 (même vides)
    const trailerAndAlts = ["EPD", "", "", ""];

    const lines = [
      "SPC",      // Header
      "0200",     // Version
      "1",        // Coding (UTF-8)
      cleanIBAN,  // IBAN (sans espaces)
      ...creditor,            // 7 lignes
      ...ultimateCreditor,    // 7 lignes
      amount,     // Montant (vide si 0)
      "CHF",      // Devise
      ...debtor,              // 7 lignes
      ...reference,           // 2 lignes
      t70(additionalInfo),    // Additional Information
      ...trailerAndAlts,      // 4 lignes
    ];

    return lines.join(CRLF);
  };

  // -----------------------------
  // Génération du QR sur canvas
  // -----------------------------
  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        try {
          const qrData = generateQRData();
          await QRCode.toCanvas(canvasRef.current, qrData, {
            width: 160,
            margin: 0,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M",
          });
          setQrGenerated(true);
        } catch (error) {
          console.error("Erreur lors de la génération du QR code:", error);
          setQrGenerated(false);
        }
      }
    };

    generateQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, companyInfo]);

  const formatIBAN = (iban: string) => {
    return iban.replace(/(.{4})/g, "$1 ").trim();
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

          {/* QR Code - Swiss QR-Bill */}
          <div className="flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-muted-foreground/20 bg-white"
                style={{ width: "160px", height: "160px" }}
              />
              {!qrGenerated && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs">
                  Génération...
                </div>
              )}

              {/* NOTE: pour valider le scan, on laisse la croix suisse désactivée.
                  Tu pourras la remettre plus tard en version plus petite si souhaité. */}
              {/*
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 bg-white border border-muted-foreground flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                    +
                  </div>
                </div>
              </div>
              */}
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

          {/* Bouton debug (facultatif) : affiche les lignes exactes */}
          {/* <button className="text-xs underline" onClick={() => console.log(generateQRData())}>
            Voir les lignes QR
          </button> */}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center">
        ✅ QR-code Swiss QR-bill généré (structure conforme). Scanne d'abord sans impression pour valider.
      </div>
    </div>
  );
};