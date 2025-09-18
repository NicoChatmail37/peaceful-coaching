import { useState, useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSearchProps {
  onClientSelect: (clientId: string) => void;
}

export const QuickSearch = ({ onClientSelect }: QuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const { clients, loading } = useClients();

  const searchableClients = useMemo(() => 
    clients.map(client => ({
      value: client.id,
      label: client.name,
      subtitle: client.email || client.phone || undefined
    })), [clients]
  );

  const selectedClient = searchableClients.find(client => client.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-left font-normal"
        >
          <Search className="h-4 w-4 mr-2 opacity-50" />
          {selectedClient ? selectedClient.label : "Rechercher un client..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un client..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Chargement..." : "Aucun client trouvé."}
            </CommandEmpty>
            <CommandGroup>
              {searchableClients.map((client) => (
                <CommandItem
                  key={client.value}
                  value={client.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    if (currentValue !== value) {
                      onClientSelect(currentValue);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{client.label}</div>
                    {client.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {client.subtitle}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};