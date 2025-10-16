import { useState, useEffect } from "react";
import { useSessions } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, FileText, Clock, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompactRecordingBar } from "@/components/transcription/CompactRecordingBar";
import { GlobalSessionReport } from "@/components/transcription/GlobalSessionReport";
import { AudioChunksHorizontalBand } from "@/components/transcription/AudioChunksHorizontalBand";
import { LiveDialogueView } from "@/components/transcription/LiveDialogueView";

interface SessionActiveProps {
  sessionId: string;
  clientId: string;
}

export const SessionActive = ({ sessionId, clientId }: SessionActiveProps) => {
  const { sessions, updateSession, finalizeSession } = useSessions(clientId);
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [lastSessionConclusions, setLastSessionConclusions] = useState("");
  const [enableStereo, setEnableStereo] = useState(false);

  const session = sessions.find(s => s.id === sessionId);

  // Charger les données de la séance
  useEffect(() => {
    if (session) {
      setTitle(session.title || "");
      setNotes(session.notes_text || "");
      setTranscriptText(session.transcript_text || "");
    }
  }, [session]);

  // Charger les conclusions de la dernière séance finalisée
  useEffect(() => {
    const finishedSessions = sessions
      .filter(s => s.status === 'done' && s.id !== sessionId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (finishedSessions.length > 0) {
      const lastSession = finishedSessions[0];
      // Extraire les conclusions des notes (dernière partie ou section spécifique)
      const conclusions = lastSession.notes_text?.split('\n').slice(-3).join('\n') || "";
      setLastSessionConclusions(conclusions);
    }
  }, [sessions, sessionId]);

  const handleSave = async () => {
    if (!session) return;

    const success = await updateSession(sessionId, {
      title: title || undefined,
      notes_text: notes || undefined,
      transcript_text: transcriptText || undefined
    });

    if (success) {
      toast({ title: "Séance sauvegardée" });
    }
  };

  const handleFinalize = async () => {
    const success = await finalizeSession(sessionId, title || undefined);
    if (success) {
      toast({ title: "Séance finalisée" });
    }
  };

  const handleInsertConclusions = () => {
    if (lastSessionConclusions) {
      setNotes(prev => prev + (prev ? '\n\n' : '') + 'Conclusions précédentes:\n' + lastSessionConclusions);
      toast({ title: "Conclusions insérées dans les notes" });
    }
  };

  const handleChunkTranscribed = (chunkId: string, text: string, timestamp: Date) => {
    // Format timestamp as [HH:MM]
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    const timePrefix = `[${hours}:${minutes}]`;
    
    // Append to transcript with timestamp
    setTranscriptText(prev => {
      const separator = prev ? '\n\n' : '';
      return prev + separator + timePrefix + ' ' + text;
    });
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Séance non trouvée
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header avec conclusions précédentes */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-medium">Séance en cours</span>
            <Badge variant={session.status === 'done' ? 'default' : 'secondary'}>
              {session.status === 'done' ? 'Terminée' : 'En cours'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>
            {session.status !== 'done' && (
              <Button size="sm" onClick={handleFinalize}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Finaliser
              </Button>
            )}
          </div>
        </div>

        {/* Conclusions de la dernière séance */}
        {lastSessionConclusions && (
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Conclusions de la dernière séance
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInsertConclusions}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Insérer comme base
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground max-h-20 overflow-y-auto">
                {lastSessionConclusions}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Barre d'enregistrement compacte */}
      <div className="border-b border-border">
        <CompactRecordingBar
          sessionId={sessionId}
          clientId={clientId}
          clientName="Client"
          onTranscriptUpdate={(text) => {
            setTranscriptText(prev => prev + (prev ? '\n' : '') + text);
          }}
          onSummaryGenerated={(summary) => {
            setNotes(prev => prev + (prev ? '\n\n' : '') + '**Résumé automatique:**\n' + summary);
          }}
          onStereoChange={setEnableStereo}
          disabled={session.status === 'done'}
        />
      </div>

      {/* Bande horizontale des morceaux audio */}
      <div className="border-b border-border p-3">
        <AudioChunksHorizontalBand
          sessionId={sessionId}
          clientId={clientId}
          enableStereo={enableStereo}
          onChunkTranscribed={handleChunkTranscribed}
        />
      </div>

      {/* Contenu de la séance */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Titre de la séance */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Titre de la séance</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la séance..."
              disabled={session.status === 'done'}
            />
          </div>

          <Separator />

          {/* Dialogue View with Tabs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Transcript / Dialogue</label>
            <Tabs defaultValue="dialogue" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dialogue">💬 Dialogue en direct</TabsTrigger>
                <TabsTrigger value="raw">📝 Texte brut</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dialogue" className="mt-2">
                <div className="border rounded-lg">
                  <LiveDialogueView sessionId={sessionId} clientId={clientId} />
                </div>
              </TabsContent>
              
              <TabsContent value="raw" className="mt-2">
                <Textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Transcript de la séance (généré automatiquement ou manuel)..."
                  className="min-h-64"
                  disabled={session.status === 'done'}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Notes et plan */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes & Plan</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes de la séance, observations, plan de traitement..."
              className="min-h-48"
              disabled={session.status === 'done'}
            />
          </div>

          <Separator />

          {/* Rapport global de séance */}
          <GlobalSessionReport
            transcript={transcriptText}
            notes={notes}
            sessionTitle={title}
            patientName={clientId} // À améliorer avec le vrai nom du patient
            sessionDate={new Date(session.created_at).toISOString()}
          />
        </div>
      </ScrollArea>
    </div>
  );
};