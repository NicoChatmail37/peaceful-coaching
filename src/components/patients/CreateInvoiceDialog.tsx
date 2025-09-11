import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { useSessions } from "@/hooks/useSessions";
import { useUIPresets } from "@/hooks/useUIPresets";
import { Session } from "@/hooks/useSessions";
import { Client } from "@/hooks/useClients";
import { format, parseISO } from "date-fns";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  patient: Client;
  onSuccess: () => void;
}

export const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  session,
  patient,
  onSuccess
}: CreateInvoiceDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const { products } = useProducts();
  const { invoiceFromSession } = useSessions();
  const { getLabel } = useUIPresets();

  // Mettre à jour le prix unitaire quand un produit est sélectionné
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setUnitPrice(product.price);
      }
    }
  }, [selectedProduct, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitPrice || unitPrice <= 0) return;

    setLoading(true);
    
    try {
      const invoiceId = await invoiceFromSession(
        session.id,
        selectedProduct || undefined,
        quantity,
        unitPrice
      );

      if (invoiceId) {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const sessionDate = session.started_at ? parseISO(session.started_at) : new Date();
  const total = quantity * unitPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Facturer la {getLabel('sessionLabel', 'séance').toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Créer une facture brouillon pour la séance du {format(sessionDate, 'd/M/yyyy')} avec {patient.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Produit/Service */}
            <div>
              <Label htmlFor="product">Produit/Service</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit/service" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - CHF {product.price}
                      {product.unit && ` / ${product.unit}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Laissez vide pour une facturation manuelle
              </p>
            </div>

            {/* Quantité et Prix unitaire */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="unitPrice">Prix unitaire (CHF)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {/* Total */}
            {unitPrice > 0 && (
              <div className="p-3 bg-accent/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">CHF {total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Description: {session.title || `${getLabel('sessionLabel', 'Séance')} du ${format(sessionDate, 'd/M/yyyy')}`}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || unitPrice <= 0}
            >
              {loading ? 'Création...' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};