import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Save, 
  CheckCircle, 
  Receipt, 
  Clock, 
  FileText, 
  StickyNote,
  Info
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Client } from "@/hooks/useClients";
import { Session, useSessions } from "@/hooks/useSessions";
import { useUIPresets } from "@/hooks/useUIPresets";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";

interface SessionWorkspaceProps {
  session: Session;
  patient: Client;
  onSessionUpdate: (session: Session) => void;
}

export const SessionWorkspace = ({
  session,
  patient,
  onSessionUpdate
}: SessionWorkspaceProps) => {
  const [title, setTitle] = useState(session.title || '');
  const [transcriptText, setTranscriptText] = useState(session.transcript_text || '');
  const [notesText, setNotesText] = useState(session.notes_text || '');
  const [wordCount, setWordCount] = useState(0);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [lastNotes, setLastNotes] = useState<string>('');

  const { 
    autosaveSession, 
    finalizeSession, 
    updateSession 
  } = useSessions();
  const { getLabel, getFieldLabel } = useUIPresets();

  // Calculer le nombre de mots du transcript
  useEffect(() => {
    const words = transcriptText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [transcriptText]);

  // Autosave pour le transcript
  useEffect(() => {
    if (transcriptText !== (session.transcript_text || '')) {
      autosaveSession(session.id, 'transcript_text', transcriptText);
    }
  }, [transcriptText, session.id, session.transcript_text, autosaveSession]);

  // Autosave pour les notes
  useEffect(() => {
    if (notesText !== (session.notes_text || '')) {
      autosaveSession(session.id, 'notes_text', notesText);
    }
  }, [notesText, session.id, session.notes_text, autosaveSession]);

  // Charger les notes de la dernière séance
  useEffect(() => {
    // TODO: Implémenter la récupération des notes de la dernière séance
    // via view_notes_next_session
    setLastNotes("Exemple de notes de la séance précédente...");
  }, [patient.id]);

  const handleFinalize = async () => {
    const success = await finalizeSession(
      session.id, 
      title || `${getLabel('sessionLabel', 'Séance')} du ${format(new Date(), 'd/M/yyyy')}`,
      new Date()
    );
    
    if (success) {
      onSessionUpdate({
        ...session,
        status: 'done',
        title: title || session.title,
        ended_at: new Date().toISOString()
      });
    }
  };

  const handleSaveTitle = async () => {
    if (title !== session.title) {
      await updateSession(session.id, { title });
      onSessionUpdate({ ...session, title });
    }
  };

  const sessionDate = session.started_at 
    ? parseISO(session.started_at)
    : new Date();

  const canInvoice = session.status === 'done';
  const isFinalized = session.status === 'done';

  return (
    <div className="h-full flex flex-col">
      {/* Header avec informations patient et séance */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{patient.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr })} à {format(sessionDate, 'HH:mm')}
            </p>
          </div>
          <Badge 
            variant={isFinalized ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {isFinalized ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {isFinalized ? 'Terminée' : 'En cours'}
          </Badge>
        </div>

        {/* Titre de la séance */}
        <div className="flex gap-2">
          <Input
            placeholder={`Titre de la ${getLabel('sessionLabel', 'séance').toLowerCase()}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            disabled={isFinalized}
          />
        </div>

        {/* Notes de la séance précédente */}
        {lastNotes && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Notes de la dernière séance :</strong> {lastNotes}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Workspace à 2 panneaux */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Panneau Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {getFieldLabel('transcript', 'Transcript')}
            </Label>
            <Badge variant="outline" className="text-xs">
              {wordCount} mots
            </Badge>
          </div>
          
          <Textarea
            placeholder={`Collez ici le compte-rendu de la ${getLabel('sessionLabel', 'séance').toLowerCase()}...`}
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="min-h-[300px] resize-none"
            disabled={isFinalized}
          />
          
          {!isFinalized && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3" />
              Sauvegarde automatique (800ms après arrêt de saisie)
            </p>
          )}
        </div>

        {/* Panneau Notes */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {getFieldLabel('todo', 'Notes de suivi')}
          </Label>
          
          <Textarea
            placeholder={`Points clés, TODO, prochaine ${getLabel('sessionLabel', 'séance').toLowerCase()}...`}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="min-h-[300px] resize-none"
            disabled={isFinalized}
          />

          {!isFinalized && (
            <p className="text-xs text-muted-foreground">
              Ces notes apparaîtront en en-tête lors de la prochaine séance
            </p>
          )}
        </div>
      </div>

      {/* Footer avec actions */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {session.invoice_id ? (
              <div className="flex items-center gap-1 text-primary">
                <Receipt className="h-4 w-4" />
                <span>Séance facturée</span>
              </div>
            ) : (
              <span>Séance non facturée</span>
            )}
          </div>

          <div className="flex gap-2">
            {!isFinalized && (
              <Button 
                onClick={handleFinalize}
                disabled={!transcriptText.trim() && !notesText.trim()}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finaliser la séance
              </Button>
            )}

            {canInvoice && !session.invoice_id && (
              <Button 
                onClick={() => setIsInvoiceDialogOpen(true)}
                variant="secondary"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Facturer la séance
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog pour créer la facture */}
      <CreateInvoiceDialog 
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        session={session}
        patient={patient}
        onSuccess={() => {
          setIsInvoiceDialogOpen(false);
          onSessionUpdate({ ...session, invoice_id: 'temp-id' });
        }}
      />
    </div>
  );
};