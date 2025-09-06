import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Invoice } from "@/pages/Index";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useCompany } from "@/hooks/useCompany";

interface QRBillProps {
  invoice: Invoice;
}

export const QRBill = ({ invoice }: QRBillProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const { activeCompany } = useCompany();

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
    const cleanIBAN = activeCompany?.iban?.replace(/\s/g, "").toUpperCase() || "";
    const amount = invoice.totalWithTva > 0 ? invoice.totalWithTva.toFixed(2) : "";

    // Si on utilise NON (pas de référence), éviter un QR‑IBAN
    if (looksLikeQrIban(cleanIBAN)) {
      console.warn(
        "IBAN détecté comme QR‑IBAN alors que Reference Type = NON. Utilise un IBAN standard."
      );
    }

    // Creditor (bénéficiaire)
    const creditor = buildStructuredAddress(
      activeCompany?.name || "",
      activeCompany?.address || "",
      activeCompany?.npa || "",
      activeCompany?.city || "",
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

  // --- taille QR en mm (35 mm) → pixels pour le canvas (net à l'impression)
  const MM = 3.7795275591; // 1 mm ≈ 3.78 px @96dpi (approx pour canvas)
  const QR_MM = 35; // Taille réduite pour 35mm au lieu de 46mm
  const deviceScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const QR_PX = Math.round(QR_MM * MM * deviceScale); // pixels réels du canvas

  useEffect(() => {
    const generateQR = async () => {
      if (canvasRef.current) {
        try {
          const qrData = generateQRData();

          // dimensionne le canvas en pixels (net) et en CSS (mm)
          const c = canvasRef.current;
          c.width = QR_PX;
          c.height = QR_PX;
          c.style.width = `${QR_MM}mm`;
          c.style.height = `${QR_MM}mm`;

          await QRCode.toCanvas(c, qrData, {
            width: QR_PX,
            margin: 0,
            color: { dark: "#000000", light: "#FFFFFF" },
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
  }, [invoice, activeCompany]);

  const formatIBAN = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div 
      className="border-2 border-dashed border-muted-foreground/20 bg-white"
      style={{ width: '190mm', maxWidth: '190mm' }}
    >
      {/* padding global */}
      <div style={{ padding: '5mm' }}>
        {/* Hauteur standard de la bande QR : 105mm */}
        <div className="flex" style={{ height: '105mm' }}>
          
          {/* 1) Récépissé – 62mm */}
          <div style={{ width: '62mm', paddingRight: '3mm' }}
               className="flex flex-col border-r border-muted-foreground/30">
            <div className="text-xs font-semibold mb-2">Récépissé</div>

            <div className="text-[8px] mb-3">
              <div className="font-medium mb-1">Compte / Payable à</div>
              <div className="leading-tight">
                <div>{formatIBAN(activeCompany?.iban || '')}</div>
                <div>{activeCompany?.name}</div>
                <div>{activeCompany?.address}</div>
                <div>{activeCompany?.npa} {activeCompany?.city}</div>
              </div>
            </div>

            <div className="text-[8px] mb-3">
              <div className="font-medium mb-1">Payable par (nom/adresse)</div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
            </div>

            <div className="mt-auto flex justify-between items-end">
              <div className="text-[8px]">
                <div className="font-medium">Monnaie</div>
                <div>CHF</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-medium">Montant</div>
                <div className="text-sm font-bold">{invoice.totalWithTva.toFixed(2)}</div>
              </div>
            </div>

            <div className="text-[6px] text-right mt-2">Point de dépôt</div>
          </div>

          {/* 2) QR Code centré – 40mm pour la zone */}
          <div style={{ width: '40mm' }}
               className="flex flex-col items-center justify-center">
            <div className="text-xs font-semibold mb-2">QR-facture</div>
            <div className="relative">
              <canvas 
                ref={canvasRef} 
                className="bg-white" 
                style={{ 
                  width: '35mm', 
                  height: '35mm',
                  maxWidth: '35mm',
                  maxHeight: '35mm'
                }}
              />
              {!qrGenerated && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs">
                  Génération...
                </div>
              )}
            </div>
            <div className="text-[8px] mt-1 text-center">Code QR suisse</div>
          </div>

          {/* 3) Section paiement – 70mm */}
          <div style={{ width: '70mm', paddingLeft: '3mm' }}
               className="flex flex-col">
            <div className="text-xs font-semibold mb-4">Section de paiement</div>

            <div className="text-[9px] mb-4">
              <div className="font-medium mb-1">Compte / Payable à</div>
              <div className="leading-tight">
                <div>{formatIBAN(activeCompany?.iban || '')}</div>
                <div>{activeCompany?.name}</div>
                <div>{activeCompany?.address}</div>
                <div>{activeCompany?.npa} {activeCompany?.city}</div>
              </div>
            </div>

            <div className="text-[9px] mb-4">
              <div className="font-medium mb-1">Informations supplémentaires</div>
              <div>{invoice.notes || `Facture ${invoice.number}`}</div>
            </div>

            <div className="text-[9px] mb-4">
              <div className="font-medium mb-1">Payable par (nom/adresse)</div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
              <div className="border-b border-gray-300 h-4 mb-1"></div>
            </div>

            <div className="mt-auto flex justify-between items-end">
              <div className="text-[9px]">
                <div className="font-medium">Monnaie</div>
                <div>CHF</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-medium">Montant</div>
                <div className="text-lg font-bold">{invoice.totalWithTva.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground text-center">
          ✅ QR-code Swiss QR-bill généré (structure conforme). Scanne d'abord sans impression pour valider.
        </div>
      </div>
    </div>
  );
};