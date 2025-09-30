import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useSessions } from "@/hooks/useSessions";
import { useInvoices } from "@/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Save, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ClientHeaderEditableProps {
  clientId: string;
  onTakeAppointment?: () => void;
  expanded?: boolean;
  editable?: boolean;
}

export const ClientHeaderEditable = ({ 
  clientId, 
  onTakeAppointment, 
  expanded = false,
  editable = false 
}: ClientHeaderEditableProps) => {
  const { clients, loading } = useClients();
  const { sessions } = useSessions(clientId);
  const { invoices } = useInvoices();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    npa: "",
    city: "",
    notes: ""
  });

  const client = clients.find(c => c.id === clientId);
  const clientInvoices = invoices.filter(inv => inv.client_id === clientId);
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const lastSession = sessions
    .filter(s => s.status === 'done')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (!client) {
    return (
      <div className="p-6 border-b border-border">
        <div className="text-muted-foreground">Client non trouvé</div>
      </div>
    );
  }

  const handleEdit = () => {
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      npa: client.npa || "",
      city: client.city || "",
      notes: client.notes || ""
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Patient mis à jour",
        description: "Les informations ont été sauvegardées"
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le patient",
        variant: "destructive"
      });
    }
  };

  if (isEditing && editable) {
    return (
      <div className="space-y-4 h-full overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Modifier la fiche patient</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nom du patient"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+41 XX XXX XX XX"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rue et numéro"
            />
          </div>

          <div>
            <Label htmlFor="npa">NPA</Label>
            <Input
              id="npa"
              value={formData.npa}
              onChange={(e) => setFormData({ ...formData, npa: e.target.value })}
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Lausanne"
            />
          </div>

          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes sur le patient..."
              rows={4}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full overflow-auto">
      {/* En-tête client avec coordonnées */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground truncate">{client.name}</h2>
          <div className="space-y-1 mt-2">
            {client.email && (
              <div className="text-sm text-muted-foreground truncate">
                📧 {client.email}
              </div>
            )}
            {client.phone && (
              <div className="text-sm text-muted-foreground">
                📞 {client.phone}
              </div>
            )}
            {(client.address || client.city) && (
              <div className="text-sm text-muted-foreground">
                📍 {[client.address, client.npa, client.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-2 shrink-0">
          {editable && (
            <Button size="sm" variant="outline" onClick={handleEdit}>
              Modifier
            </Button>
          )}
          {onTakeAppointment && (
            <Button size="sm" variant="outline" onClick={onTakeAppointment}>
              <Calendar className="h-4 w-4 mr-1" />
              Prendre RDV
            </Button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <div className="text-base font-semibold text-foreground">{sessions.length}</div>
          <div className="text-xs text-muted-foreground">Séances</div>
        </div>

        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <div className="text-base font-semibold text-foreground">CHF {totalInvoiced.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Facturé</div>
        </div>

        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <div className="text-base font-semibold text-foreground">{clientInvoices.length}</div>
          <div className="text-xs text-muted-foreground">Factures</div>
        </div>

        {lastSession ? (
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <div className="text-base font-semibold text-foreground">{format(new Date(lastSession.created_at), 'dd/MM', { locale: fr })}</div>
            <div className="text-xs text-muted-foreground">Dernière</div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <div className="text-base font-semibold text-foreground">-</div>
            <div className="text-xs text-muted-foreground">Dernière</div>
          </div>
        )}
      </div>

      {/* Notes si mode élargi */}
      {expanded && client.notes && (
        <div className="bg-muted/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
};
