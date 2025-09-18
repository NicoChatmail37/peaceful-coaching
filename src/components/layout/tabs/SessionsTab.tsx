import { useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SessionActive } from "./SessionActive";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Clock } from "lucide-react";

interface SessionsTabProps {
  clientId: string;
}

export const SessionsTab = ({ clientId }: SessionsTabProps) => {
  const { sessions, createSession } = useSessions(clientId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const sortedSessions = sessions.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleNewSession = async () => {
    const newSessionId = await createSession(clientId);
    if (newSessionId) {
      setActiveSessionId(newSessionId);
    }
  };

  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;

  return (
    <div className="h-full flex">
      {/* Liste des séances */}
      <div className="w-80 border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Séances</h3>
            <Button size="sm" onClick={handleNewSession}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-4 space-y-3">
            {sortedSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune séance</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={handleNewSession}>
                  Créer la première séance
                </Button>
              </div>
            ) : (
              sortedSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-soft ${
                    activeSessionId === session.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {session.title || 'Séance sans titre'}
                      </span>
                      <Badge variant={session.status === 'done' ? 'default' : 'secondary'}>
                        {session.status === 'done' ? 'Terminée' : 'En cours'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(session.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </div>
                    {session.notes_text && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {session.notes_text.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Séance active */}
      <div className="flex-1">
        {activeSession ? (
          <SessionActive 
            sessionId={activeSession.id}
            clientId={clientId}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Clock className="h-12 w-12 mx-auto opacity-50" />
              <h3 className="text-lg font-medium">Sélectionnez une séance</h3>
              <p className="text-sm">Cliquez sur une séance à gauche pour l'ouvrir</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};