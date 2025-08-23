import { useState, useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

export interface Client {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  address?: string;
  npa?: string;
  city?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ClientForm {
  name: string;
  address: string;
  npa: string;
  city: string;
  phone: string;
  email: string;
  notes: string;
}

const Clients = () => {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<ClientForm>();

  const fetchClients = async () => {
    if (!activeCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ClientForm) => {
    if (!activeCompany) return;

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Client mis à jour avec succès",
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{
            ...data,
            company_id: activeCompany.id,
            user_id: activeCompany.user_id,
          }]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Client créé avec succès",
        });
      }

      reset();
      setEditingClient(null);
      setIsDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client",
        variant: "destructive",
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });

      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setValue('name', client.name);
    setValue('address', client.address || '');
    setValue('npa', client.npa || '');
    setValue('city', client.city || '');
    setValue('phone', client.phone || '');
    setValue('email', client.email || '');
    setValue('notes', client.notes || '');
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingClient(null);
    reset();
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (activeCompany) {
      fetchClients();
    }
  }, [activeCompany]);

  if (!activeCompany) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune entreprise sélectionnée</h3>
            <p className="text-muted-foreground">
              Veuillez sélectionner une entreprise pour gérer vos clients
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
          <h1 className="text-3xl font-bold">Gestion des clients</h1>
          <p className="text-muted-foreground">
            {activeCompany.name} • {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du client *</Label>
                  <Input {...register('name', { required: true })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input {...register('email')} type="email" />
                </div>
                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Input {...register('address')} />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input {...register('phone')} />
                </div>
                <div>
                  <Label htmlFor="npa">NPA</Label>
                  <Input {...register('npa')} />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input {...register('city')} />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea {...register('notes')} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {editingClient ? 'Mettre à jour' : 'Créer le client'}
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
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p>Chargement des clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Aucun client ne correspond à votre recherche' 
                : 'Commencez par créer votre premier client'
              }
            </p>
            {!searchTerm && (
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteClient(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.email && (
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                )}
                {(client.address || client.city) && (
                  <p className="text-sm text-muted-foreground">
                    {client.address}
                    {client.address && client.city && ', '}
                    {client.npa && `${client.npa} `}{client.city}
                  </p>
                )}
                {client.phone && (
                  <p className="text-sm text-muted-foreground">{client.phone}</p>
                )}
                {client.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    {client.notes.substring(0, 100)}
                    {client.notes.length > 100 && '...'}
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

export default Clients;