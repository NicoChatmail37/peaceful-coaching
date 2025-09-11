import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Clock, FileText, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Client } from "@/hooks/useClients";
import { Session, SessionWithClient, useSessions } from "@/hooks/useSessions";
import { useUIPresets } from "@/hooks/useUIPresets";

interface TimelinePanelProps {
  patient: Client;
  sessions: SessionWithClient[];
  loading: boolean;
  onSessionSelect: (session: Session) => void;
}

export const TimelinePanel = ({
  patient,
  sessions,
  loading,
  onSessionSelect
}: TimelinePanelProps) => {
  const { createSession } = useSessions();
  const { getLabel } = useUIPresets();
  const [creating, setCreating] = useState(false);

  const handleCreateSession = async () => {
    setCreating(true);
    try {
      const sessionId = await createSession(patient.id, new Date());
      if (sessionId) {
        // Trouver la session créée et la sélectionner
        const newSession = sessions.find(s => s.id === sessionId);
        if (newSession) {
          onSessionSelect(newSession);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'done': return '✅';
      case 'canceled': return '❌';
      default: return '📄';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'done': return 'Terminée';
      case 'canceled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'done': return 'default';
      case 'draft': return 'secondary';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header avec bouton nouvelle séance */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">
            {getLabel('sessionLabel', 'Séances')} & Factures
          </h3>
          <Badge variant="outline" className="text-xs">
            {sessions.length} éléments
          </Badge>
        </div>

        {/* Séance du jour */}
        <div className="bg-accent/30 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">
                {getLabel('sessionLabel', 'Séance')} d'aujourd'hui
              </h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'EEEE d MMMM', { locale: fr })}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCreateSession}
              disabled={creating}
            >
              <Plus className="h-4 w-4 mr-1" />
              {creating ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline des séances */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Aucune séance enregistrée</p>
              <p className="text-xs">
                Commencez par créer une nouvelle séance
              </p>
            </div>
          ) : (
            sessions.map((session, index) => {
              const sessionDate = session.started_at 
                ? parseISO(session.started_at)
                : new Date();

              return (
                <div key={session.id} className="relative">
                  {/* Ligne de temps */}
                  {index < sessions.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
                  )}

                  <div 
                    className="flex gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/30"
                    onClick={() => onSessionSelect(session)}
                  >
                    {/* Icône de statut */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-sm">
                      {getStatusIcon(session.status)}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {session.title || `${getLabel('sessionLabel', 'Séance')} du ${format(sessionDate, 'd/M/yy')}`}
                        </h4>
                        <Badge 
                          variant={getStatusVariant(session.status)}
                          className="text-xs ml-2"
                        >
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(sessionDate, 'HH:mm')}
                        </span>
                        {session.ended_at && (
                          <span>
                            → {format(parseISO(session.ended_at), 'HH:mm')}
                          </span>
                        )}
                      </div>

                      {/* Prévisualisation du contenu */}
                      {(session.transcript_text || session.notes_text) && (
                        <div className="text-xs text-muted-foreground">
                          {session.transcript_text && (
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">
                                {session.transcript_text.substring(0, 100)}
                                {session.transcript_text.length > 100 && '...'}
                              </span>
                            </div>
                          )}
                          {session.notes_text && (
                            <div className="flex items-center gap-1">
                              <Receipt className="h-3 w-3" />
                              <span className="truncate">
                                Notes: {session.notes_text.substring(0, 50)}
                                {session.notes_text.length > 50 && '...'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lien facture */}
                      {session.invoice_id && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <Receipt className="h-3 w-3" />
                            <span>Facturée</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};