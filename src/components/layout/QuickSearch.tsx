import { useState, useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSearchProps {
  onClientSelect: (clientId: string) => void;
  selectedClientId?: string | null;
}

export const QuickSearch = ({ onClientSelect, selectedClientId }: QuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const { clients, loading } = useClients();
  
  const activeClient = clients.find(c => c.id === selectedClientId);

  const searchableClients = useMemo(() => 
    clients.map(client => ({
      value: client.id,
      label: client.name,
      subtitle: client.city ? `${client.npa || ''} ${client.city}` : (client.email || client.phone || undefined)
    })), [clients]
  );

  return (
    <div className="flex items-center gap-3 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Rechercher...</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
      
      {activeClient && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
          <User className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-primary">{activeClient.name}</span>
            {activeClient.city && (
              <span className="text-xs text-muted-foreground">
                {activeClient.npa} {activeClient.city}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};