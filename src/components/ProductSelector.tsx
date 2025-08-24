import { useProducts, Product } from "@/hooks/useProducts";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProductSelectorProps {
  value?: string;
  onSelect: (product: Product | null) => void;
  onCreateNew?: () => void;
}

export const ProductSelector = ({ value, onSelect, onCreateNew }: ProductSelectorProps) => {
  const { products, loading } = useProducts();

  const options = products.map(product => ({
    value: product.id,
    label: product.name,
    subtitle: `CHF ${product.price.toFixed(2)} ${product.unit ? `/ ${product.unit}` : ''}`
  }));

  const handleSelect = (productId: string) => {
    if (productId) {
      const selectedProduct = products.find(p => p.id === productId);
      onSelect(selectedProduct || null);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Combobox
          options={options}
          value={value}
          onSelect={handleSelect}
          placeholder={loading ? "Chargement..." : "Rechercher un produit/service..."}
          emptyText="Aucun produit trouvé."
          searchPlaceholder="Tapez le nom du produit..."
          className="flex-1"
        />
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCreateNew}
            title="Nouveau produit"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};