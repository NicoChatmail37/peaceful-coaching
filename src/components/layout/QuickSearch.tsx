import { useState, useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, Check, ChevronsUpDown, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientDialog } from "@/components/patients/PatientDialog";

interface QuickSearchProps {
  onClientSelect: (clientId: string) => void;
  selectedClientId?: string | null;
}

export const QuickSearch = ({ onClientSelect, selectedClientId }: QuickSearchProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setIsDialogOpen(true);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="font-medium">Créer nouvelle fiche patient</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {activeClient && (
        <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
          <User className="h-3 w-3 text-primary" />
          <span className="text-sm font-medium text-primary">{activeClient.name}</span>
        </div>
      )}

      <PatientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        patient={null}
        onSuccess={() => {
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
};