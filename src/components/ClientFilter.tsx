import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClients, Client } from "@/hooks/useClients";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientFilterProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
  placeholder?: string;
}

export const ClientFilter = ({ selectedClient, onClientSelect, placeholder = "Tous les clients" }: ClientFilterProps) => {
  const { clients } = useClients();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientSelect = (clientId: string) => {
    if (clientId === "all") {
      onClientSelect(null);
    } else {
      const client = clients.find(c => c.id === clientId);
      onClientSelect(client || null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Filtrer par client</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedClient?.id || "all"} 
          onValueChange={handleClientSelect}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{placeholder}</SelectItem>
            {filteredClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClient && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onClientSelect(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Input
        placeholder="Rechercher un client..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="text-sm"
      />
    </div>
  );
};