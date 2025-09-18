import { useClients } from "@/hooks/useClients";
import { useSessions } from "@/hooks/useSessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Clock, User } from "lucide-react";

interface OverviewTabProps {
  clientId: string;
}

export const OverviewTab = ({ clientId }: OverviewTabProps) => {
  const { clients } = useClients();
  const { sessions } = useSessions(clientId);

  const client = clients.find(c => c.id === clientId);
  const recentSessions = sessions
    .slice(0, 5)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (!client) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Client non trouvé
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nom</label>
              <p className="text-sm">{client.name}</p>
            </div>
            {client.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="text-sm">{client.phone}</p>
              </div>
            )}
            {client.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                <p className="text-sm">
                  {client.address}
                  {client.npa && client.city && (
                    <><br />{client.npa} {client.city}</>
                  )}
                </p>
              </div>
            )}
            {client.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Séances récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Séances récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune séance enregistrée
              </p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.title || 'Séance sans titre'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant={session.status === 'done' ? 'default' : 'secondary'}>
                      {session.status === 'done' ? 'Terminée' : 'En cours'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé activité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Résumé d'activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{sessions.length}</div>
                <div className="text-xs text-muted-foreground">Séances totales</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {sessions.filter(s => s.status === 'done').length}
                </div>
                <div className="text-xs text-muted-foreground">Séances terminées</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};