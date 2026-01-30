import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/hooks/useProducts";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (data: Omit<Product, 'id'>) => Promise<void>;
  loading?: boolean;
}

export const ProductDialog = ({
  open,
  onOpenChange,
  product,
  onSave,
  loading = false
}: ProductDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState("heure");
  const [category, setCategory] = useState("");
  const [isService, setIsService] = useState(true);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price);
      setUnit(product.unit || "heure");
      setCategory(product.category || "");
      setIsService(product.is_service);
    } else {
      // Reset form for new product
      setName("");
      setDescription("");
      setPrice(0);
      setUnit("heure");
      setCategory("");
      setIsService(true);
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price < 0) return;

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      price,
      unit: unit.trim() || undefined,
      category: category.trim() || undefined,
      is_service: isService
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le produit/service" : "Nouveau produit/service"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du produit ou service."
              : "Créez un nouveau produit ou service pour votre catalogue."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_service">Type</Label>
              <div className="flex items-center gap-3">
                <span className={!isService ? "font-medium" : "text-muted-foreground"}>
                  Produit
                </span>
                <Switch
                  id="is_service"
                  checked={isService}
                  onCheckedChange={setIsService}
                />
                <span className={isService ? "font-medium" : "text-muted-foreground"}>
                  Service
                </span>
              </div>
            </div>

            {/* Nom */}
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Séance de coaching"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle..."
                rows={3}
              />
            </div>

            {/* Prix et Unité */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Prix (CHF) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unité</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: heure, séance, pièce"
                />
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Coaching, Thérapie, Consultation"
              />
            </div>
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Enregistrement..." : (isEditing ? "Enregistrer" : "Créer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
