import { useClients } from "@/hooks/useClients";
import { useSessions } from "@/hooks/useSessions";
import { useInvoices } from "@/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Clock, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClientHeaderProps {
  clientId: string;
  onTakeAppointment?: () => void;
  expanded?: boolean;
}

export const ClientHeader = ({ clientId, onTakeAppointment, expanded = false }: ClientHeaderProps) => {
  const { clients } = useClients();
  const { sessions } = useSessions(clientId);
  const { invoices } = useInvoices();

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
        
        {onTakeAppointment && (
          <Button size="sm" variant="outline" onClick={onTakeAppointment} className="ml-2 shrink-0">
            <Calendar className="h-4 w-4 mr-1" />
            Prendre RDV
          </Button>
        )}
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