import { useState, useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Edit, Trash2, ShoppingCart, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

export interface ProductService {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  category?: string;
  is_service: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  is_service: boolean;
  is_active: boolean;
}

const Products = () => {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "products" | "services">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductService | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<ProductForm>({
    defaultValues: {
      unit: 'pièce',
      is_service: false,
      is_active: true,
    }
  });

  const watchIsService = watch('is_service');

  const fetchProducts = async () => {
    if (!activeCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits/services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    if (!activeCompany) return;

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products_services')
          .update(data)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: `${data.is_service ? 'Service' : 'Produit'} mis à jour avec succès`,
        });
      } else {
        const { error } = await supabase
          .from('products_services')
          .insert([{
            ...data,
            company_id: activeCompany.id,
            user_id: activeCompany.user_id,
          }]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: `${data.is_service ? 'Service' : 'Produit'} créé avec succès`,
        });
      }

      reset();
      setEditingProduct(null);
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le produit/service",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit/service supprimé avec succès",
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit/service",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products_services')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      fetchProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (product: ProductService) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('description', product.description || '');
    setValue('price', product.price);
    setValue('unit', product.unit);
    setValue('category', product.category || '');
    setValue('is_service', product.is_service);
    setValue('is_active', product.is_active);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    reset();
    setIsDialogOpen(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || 
                       (filterType === "products" && !product.is_service) ||
                       (filterType === "services" && product.is_service);
    
    return matchesSearch && matchesType;
  });

  useEffect(() => {
    if (activeCompany) {
      fetchProducts();
    }
  }, [activeCompany]);

  if (!activeCompany) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune entreprise sélectionnée</h3>
            <p className="text-muted-foreground">
              Veuillez sélectionner une entreprise pour gérer vos produits et services
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produits & Services</h1>
          <p className="text-muted-foreground">
            {activeCompany.name} • {products.length} élément{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau produit/service
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit/service' : 'Nouveau produit/service'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch {...register('is_service')} />
                <Label>
                  {watchIsService ? 'Service' : 'Produit'}
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input {...register('name', { required: true })} />
                </div>
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Input {...register('category')} />
                </div>
                <div>
                  <Label htmlFor="price">Prix (CHF) *</Label>
                  <Input 
                    {...register('price', { required: true, valueAsNumber: true })} 
                    type="number" 
                    step="0.01" 
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unité</Label>
                  <Select 
                    onValueChange={(value) => setValue('unit', value)}
                    defaultValue="pièce"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pièce">Pièce</SelectItem>
                      <SelectItem value="heure">Heure</SelectItem>
                      <SelectItem value="jour">Jour</SelectItem>
                      <SelectItem value="mètre">Mètre</SelectItem>
                      <SelectItem value="kg">Kilogramme</SelectItem>
                      <SelectItem value="litre">Litre</SelectItem>
                      <SelectItem value="forfait">Forfait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea {...register('description')} />
              </div>

              <div className="flex items-center space-x-2">
                <Switch {...register('is_active')} />
                <Label>Actif</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {editingProduct ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="products">Produits</SelectItem>
            <SelectItem value="services">Services</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline">
          {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p>Chargement...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Aucun résultat' : 'Aucun produit/service'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Aucun élément ne correspond à votre recherche' 
                : 'Commencez par créer votre premier produit ou service'
              }
            </p>
            {!searchTerm && (
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un produit/service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={`hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {product.is_service ? (
                      <Wrench className="h-5 w-5 text-blue-500" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 text-green-500" />
                    )}
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(product.id, product.is_active)}
                    >
                      <Switch checked={product.is_active} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{product.price.toFixed(2)} CHF</span>
                  <Badge variant={product.is_service ? "default" : "secondary"}>
                    {product.is_service ? 'Service' : 'Produit'}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  par {product.unit}
                </p>
                
                {product.category && (
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                )}
                
                {product.description && (
                  <p className="text-sm text-muted-foreground">
                    {product.description.substring(0, 100)}
                    {product.description.length > 100 && '...'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;