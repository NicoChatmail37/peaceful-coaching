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
}

export const ClientHeader = ({ clientId }: ClientHeaderProps) => {
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
    <div className="p-6 border-b border-border bg-gradient-to-r from-card to-muted/20">
      <div className="space-y-4">
        {/* Infos client */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            {client.email && (
              <p className="text-sm text-muted-foreground">{client.email}</p>
            )}
            {client.phone && (
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            )}
          </div>
          
          <Button className="bg-primary hover:bg-primary/90">
            <Calendar className="h-4 w-4 mr-2" />
            Prendre rendez-vous
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <div className="text-lg font-semibold">{sessions.length}</div>
                <div className="text-xs text-muted-foreground">Séances</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-success" />
              <div>
                <div className="text-lg font-semibold">{clientInvoices.length}</div>
                <div className="text-xs text-muted-foreground">Factures</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-accent" />
              <div>
                <div className="text-lg font-semibold">{totalInvoiced.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">CHF facturés</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Dernière séance */}
        {lastSession && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Dernière séance: {format(new Date(lastSession.created_at), 'dd MMM yyyy', { locale: fr })}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};