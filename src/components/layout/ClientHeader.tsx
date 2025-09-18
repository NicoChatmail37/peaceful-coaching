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
}

export const ClientHeader = ({ clientId, onTakeAppointment }: ClientHeaderProps) => {
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
    <div className="space-y-3">
      {/* En-tête client compact */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{client.name}</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            {client.email && (
              <span className="flex items-center gap-1 truncate">
                📧 {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                📞 {client.phone}
              </span>
            )}
          </div>
        </div>
        
        {onTakeAppointment && (
          <Button size="sm" variant="outline" onClick={onTakeAppointment} className="ml-2 shrink-0">
            <Calendar className="h-3 w-3 mr-1" />
            RDV
          </Button>
        )}
      </div>

      {/* KPI rapides compacts */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded p-2 text-center">
          <div className="text-sm font-semibold text-foreground">{sessions.length}</div>
          <div className="text-xs text-muted-foreground">Séances</div>
        </div>

        <div className="bg-muted/30 rounded p-2 text-center">
          <div className="text-sm font-semibold text-foreground">{clientInvoices.length}</div>
          <div className="text-xs text-muted-foreground">Factures</div>
        </div>

        <div className="bg-muted/30 rounded p-2 text-center">
          <div className="text-sm font-semibold text-foreground">CHF {totalInvoiced.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Facturé</div>
        </div>

        {lastSession && (
          <div className="bg-muted/30 rounded p-2 text-center">
            <div className="text-sm font-semibold text-foreground">{format(new Date(lastSession.created_at), 'dd/MM', { locale: fr })}</div>
            <div className="text-xs text-muted-foreground">Dernière</div>
          </div>
        )}
      </div>
    </div>
  );
};