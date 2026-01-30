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

  // --- taille QR en mm (46 mm selon specs officielles Swiss QR Bill)
  const MM = 3.7795275591; // 1 mm ≈ 3.78 px @96dpi (approx pour canvas)
  const QR_MM = 46; // Taille officielle selon Style Guide SIX
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
      className="bg-white border-t-2 border-dashed border-muted-foreground/20"
      style={{ width: 'calc(100% + 48px)', marginLeft: '-24px', marginRight: '-24px' }}
    >
      {/* Hauteur standard de la bande QR : 105mm - conforme DIN A6/5 */}
      <div className="flex" style={{ height: '105mm' }}>
        
        {/* 1) RÉCÉPISSÉ – 62mm (specs officielles) */}
        <div 
          style={{ width: '62mm', padding: '5mm' }}
          className="flex flex-col border-r border-black"
        >
          {/* Titre "Récépissé" - 11pt bold */}
          <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '5mm' }}>
            Récépissé
          </div>

          {/* Compte / Payable à - headings 6pt bold, values 8pt */}
          <div style={{ fontSize: '6pt', marginBottom: '5mm' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Compte / Payable à</div>
            <div style={{ fontSize: '8pt', lineHeight: '1.2' }}>
              <div>{formatIBAN(activeCompany?.iban || '')}</div>
              <div>{activeCompany?.name}</div>
              <div>{activeCompany?.address}</div>
              <div>{activeCompany?.npa} {activeCompany?.city}</div>
            </div>
          </div>

          {/* Référence (si présente) */}
          {invoice.number && (
            <div style={{ fontSize: '6pt', marginBottom: '5mm' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Référence</div>
              <div style={{ fontSize: '8pt' }}>{invoice.number}</div>
            </div>
          )}

          {/* Payable par (champs vides) */}
          <div style={{ fontSize: '6pt', marginBottom: '5mm' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Payable par (nom/adresse)</div>
            <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
            <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
            <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
          </div>

          {/* Monnaie et Montant - en bas */}
          <div className="mt-auto flex justify-between items-end" style={{ marginBottom: '5mm' }}>
            <div style={{ fontSize: '6pt' }}>
              <div style={{ fontWeight: 'bold' }}>Monnaie</div>
              <div style={{ fontSize: '8pt' }}>CHF</div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>Montant</div>
              <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                {invoice.totalWithTva.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Point de dépôt */}
          <div style={{ fontSize: '6pt', textAlign: 'right' }}>Point de dépôt</div>
        </div>

        {/* 2) SECTION DE PAIEMENT – 148mm (specs officielles) */}
        <div 
          style={{ width: '148mm', padding: '5mm', position: 'relative' }}
          className="flex flex-col"
        >
          {/* Titre "Section de paiement" - 11pt bold */}
          <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '5mm' }}>
            Section de paiement
          </div>

          {/* Layout en 2 colonnes : QR Code à gauche, Infos à droite */}
          <div className="flex gap-2 items-start" style={{ flex: 1 }}>
            
            {/* Colonne gauche : Swiss QR Code */}
            <div className="flex flex-col items-center justify-start" style={{ width: '56mm', paddingTop: '0mm' }}>
              <div className="relative" style={{ margin: '5mm' }}>
                <canvas 
                  ref={canvasRef} 
                  className="bg-white" 
                  style={{ 
                    width: '46mm', 
                    height: '46mm',
                    maxWidth: '46mm',
                    maxHeight: '46mm'
                  }}
                />
                {!qrGenerated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground" style={{ fontSize: '8pt' }}>
                    Génération...
                  </div>
                )}
              </div>
              <div style={{ fontSize: '6pt', fontWeight: 'bold', marginTop: '2mm' }}>Swiss QR Code</div>
            </div>

            {/* Colonne droite : Informations */}
            <div className="flex flex-col flex-1" style={{ fontSize: '8pt', paddingTop: '0mm' }}>
              
              {/* Compte / Payable à */}
              <div style={{ marginBottom: '5mm' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Compte / Payable à</div>
                <div style={{ fontSize: '10pt', lineHeight: '1.3' }}>
                  <div>{formatIBAN(activeCompany?.iban || '')}</div>
                  <div>{activeCompany?.name}</div>
                  <div>{activeCompany?.address}</div>
                  <div>{activeCompany?.npa} {activeCompany?.city}</div>
                </div>
              </div>

              {/* Référence (si présente) */}
              {invoice.number && (
                <div style={{ marginBottom: '5mm' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Référence</div>
                  <div style={{ fontSize: '10pt' }}>{invoice.number}</div>
                </div>
              )}

              {/* Informations supplémentaires */}
              <div style={{ marginBottom: '5mm' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Informations supplémentaires</div>
                <div style={{ fontSize: '10pt' }}>{invoice.notes || `Facture ${invoice.number}`}</div>
              </div>

              {/* Payable par */}
              <div style={{ marginBottom: '5mm' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>Payable par (nom/adresse)</div>
                <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
                <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
                <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
                <div className="border-b border-gray-400" style={{ height: '3.5mm', marginBottom: '1mm' }}></div>
              </div>

              {/* Monnaie et Montant - en bas à droite */}
              <div className="mt-auto flex justify-between items-end">
                <div>
                  <div style={{ fontWeight: 'bold' }}>Monnaie</div>
                  <div style={{ fontSize: '10pt' }}>CHF</div>
                </div>
                <div className="text-right">
                  <div style={{ fontWeight: 'bold' }}>Montant</div>
                  <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>
                    {invoice.totalWithTva.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};