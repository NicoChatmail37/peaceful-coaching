import { useClients, Client } from "@/hooks/useClients";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ClientSelectorProps {
  value?: string;
  onSelect: (client: Client | null) => void;
  onCreateNew?: () => void;
}

export const ClientSelector = ({ value, onSelect, onCreateNew }: ClientSelectorProps) => {
  const { clients, loading } = useClients();

  const options = clients.map(client => ({
    value: client.id,
    label: client.name,
    subtitle: client.city ? `${client.npa} ${client.city}` : undefined
  }));

  const handleSelect = (clientId: string) => {
    if (clientId) {
      const selectedClient = clients.find(c => c.id === clientId);
      onSelect(selectedClient || null);
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
          placeholder={loading ? "Chargement..." : "Rechercher un client..."}
          emptyText="Aucun client trouvé."
          searchPlaceholder="Tapez le nom du client..."
          className="flex-1"
        />
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCreateNew}
            title="Nouveau client"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};