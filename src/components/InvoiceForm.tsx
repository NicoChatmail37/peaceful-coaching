import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { Invoice, InvoiceItem } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { ClientSelector } from "@/components/ClientSelector";
import { ProductSelector } from "@/components/ProductSelector";
import { Client } from "@/hooks/useClients";
import { Product } from "@/hooks/useProducts";
import { useCompany } from "@/hooks/useCompany";
import { useInvoices, FullInvoice } from "@/hooks/useInvoices";

interface InvoiceFormProps {
  onInvoiceCreate: (invoice: Invoice) => void;
}

export const InvoiceForm = ({ onInvoiceCreate }: InvoiceFormProps) => {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const { saveInvoice } = useInvoices();
  const [formData, setFormData] = useState({
    clientName: "",
    clientAddress: "",
    clientNPA: "",
    clientCity: "",
    notes: "",
    includeTva: false
  });
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, price: 0, total: 0 }
  ]);
  
  const [selectedProducts, setSelectedProducts] = useState<(string | null)[]>([null]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0, total: 0 }]);
    setSelectedProducts([...selectedProducts, null]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    console.log('updateItem called with:', { index, field, value });
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    console.log('Updated items:', newItems);
    setItems(newItems);
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setFormData({
        ...formData,
        clientName: client.name,
        clientAddress: client.address || "",
        clientNPA: client.npa || "",
        clientCity: client.city || ""
      });
    }
  };

  const handleProductSelect = (index: number, product: Product | null) => {
    console.log('handleProductSelect called with:', { index, product });
    
    const newSelectedProducts = [...selectedProducts];
    newSelectedProducts[index] = product?.id || null;
    setSelectedProducts(newSelectedProducts);
    
    if (product) {
      console.log('Product data:', { description: product.description, name: product.name, price: product.price });
      // Utilise directement la description du produit depuis la base de données
      const description = product.description || product.name;
      console.log('Setting description to:', description);
      updateItem(index, 'description', description);
      updateItem(index, 'price', product.price);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tva = formData.includeTva ? subtotal * 0.077 : 0; // TVA suisse 7.7%
    const totalWithTva = subtotal + tva;
    
    return { subtotal, tva, totalWithTva };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeCompany?.name || !activeCompany?.iban) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez d'abord configurer les informations de votre entreprise dans les paramètres.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.clientName || items.some(item => !item.description || item.price <= 0)) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive"
      });
      return;
    }

    const { subtotal, tva, totalWithTva } = calculateTotals();
    const invoiceNumber = `F-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice for Supabase
    const supabaseInvoice: FullInvoice = {
      number: invoiceNumber,
      date: today,
      due_date: dueDate,
      subtotal: subtotal,
      tva_rate: formData.includeTva ? 7.7 : 0,
      tva_amount: formData.includeTva ? tva : 0,
      total: formData.includeTva ? totalWithTva : subtotal,
      notes: formData.notes,
      status: 'draft',
      clientName: formData.clientName,
      clientAddress: formData.clientAddress,
      clientNPA: formData.clientNPA,
      clientCity: formData.clientCity,
      items: items.filter(item => item.description && item.price > 0).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.total
      }))
    };

    // Save to Supabase
    const savedInvoiceId = await saveInvoice(supabaseInvoice);
    
    if (savedInvoiceId) {
      // Create invoice for local state (backward compatibility)
      const invoice: Invoice = {
        id: savedInvoiceId,
        number: invoiceNumber,
        date: today,
        dueDate,
        clientName: formData.clientName,
        clientAddress: formData.clientAddress,
        clientNPA: formData.clientNPA,
        clientCity: formData.clientCity,
        items: items.filter(item => item.description && item.price > 0),
        total: subtotal,
        tva: formData.includeTva ? tva : 0,
        totalWithTva: formData.includeTva ? totalWithTva : subtotal,
        notes: formData.notes,
        status: 'draft'
      };

      onInvoiceCreate(invoice);

      // Reset form
      setFormData({
        clientName: "",
        clientAddress: "",
        clientNPA: "",
        clientCity: "",
        notes: "",
        includeTva: false
      });
      setItems([{ description: "", quantity: 1, price: 0, total: 0 }]);
      setSelectedClient(null);
      setSelectedProducts([null]);
    }
  };

  const { subtotal, tva, totalWithTva } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👤 Informations client
          </CardTitle>
          <CardDescription>
            Renseignez les informations de votre client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sélectionner un client</Label>
              <ClientSelector
                value={selectedClient?.id}
                onSelect={handleClientSelect}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom / Entreprise *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Nom du client ou entreprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Adresse *</Label>
              <Input
                id="clientAddress"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                placeholder="Rue et numéro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientNPA">NPA *</Label>
              <Input
                id="clientNPA"
                value={formData.clientNPA}
                onChange={(e) => setFormData({ ...formData, clientNPA: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientCity">Ville *</Label>
              <Input
                id="clientCity"
                value={formData.clientCity}
                onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                placeholder="Lausanne"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📦 Articles et services
          </CardTitle>
          <CardDescription>
            Ajoutez les articles ou services facturés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Article {index + 1}</h4>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Sélectionner un produit/service</Label>
                  <ProductSelector
                    value={selectedProducts[index] || undefined}
                    onSelect={(product) => handleProductSelect(index, product)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description du service ou produit"
                    />
                  </div>
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix unitaire (CHF)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="font-semibold">CHF {item.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un article
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💰 Total de la facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="includeTva" className="text-sm font-medium">
              Inclure la TVA (7.7%)
            </Label>
            <Switch
              id="includeTva"
              checked={formData.includeTva}
              onCheckedChange={(checked) => setFormData({ ...formData, includeTva: checked })}
            />
          </div>
          <div className="flex justify-between">
            <span>Sous-total:</span>
            <span>CHF {subtotal.toFixed(2)}</span>
          </div>
          {formData.includeTva && (
            <div className="flex justify-between">
              <span>TVA (7.7%):</span>
              <span>CHF {tva.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>CHF {(formData.includeTva ? totalWithTva : subtotal).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Remarques</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Conditions de paiement, remarques particulières..."
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          size="lg"
          className="bg-gradient-primary hover:bg-primary/90 shadow-glow"
        >
          ✨ Créer la facture
        </Button>
      </div>
    </form>
  );
};