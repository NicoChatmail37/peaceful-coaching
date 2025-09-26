import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, History, Clock } from "lucide-react";
import { useSessions } from "@/hooks/useSessions";
import { SessionActive } from "./SessionActive";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SessionsChildTabProps {
  clientId: string | null;
}

export const SessionsChildTab = ({ clientId }: SessionsChildTabProps) => {
  const { sessions, createSession, loading } = useSessions(clientId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Find active session
  const activeSession = sessions.find(s => s.status === 'draft');
  
  // Recent sessions (completed)
  const recentSessions = sessions
    .filter(s => s.status === 'done')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  useEffect(() => {
    if (activeSession) {
      setActiveSessionId(activeSession.id);
    }
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!clientId) return;
    
    const sessionId = await createSession(clientId);
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  };

  if (!clientId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <Clock className="h-12 w-12 mx-auto opacity-50" />
          <h3 className="text-lg font-medium">Aucun patient sélectionné</h3>
          <p className="text-sm">Sélectionnez un patient pour gérer ses séances</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Colonne gauche : Sessions actives et historique */}
      <div className="w-80 border-r border-border bg-muted/30 p-4">
        {/* Séance active */}
        {activeSession ? (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Play className="h-4 w-4 text-green-500" />
                Séance en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setActiveSessionId(activeSession.id)}
                variant={activeSessionId === activeSession.id ? "default" : "outline"}
                className="w-full"
                size="sm"
              >
                {activeSession.title || 'Séance sans titre'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <Button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle séance
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique des séances */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Séances récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-2 rounded border cursor-pointer hover:bg-muted/50"
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="font-medium text-sm">
                      {session.title || 'Séance sans titre'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      Terminée
                    </Badge>
                  </div>
                ))}
                {recentSessions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune séance précédente
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Colonne droite : Contenu de la séance */}
      <div className="flex-1 overflow-hidden">
        {activeSessionId ? (
          <SessionActive 
            sessionId={activeSessionId}
            clientId={clientId}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="text-4xl">📝</div>
              <h3 className="text-lg font-medium">Aucune séance sélectionnée</h3>
              <p className="text-sm">Créez une nouvelle séance ou sélectionnez-en une dans l'historique</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};