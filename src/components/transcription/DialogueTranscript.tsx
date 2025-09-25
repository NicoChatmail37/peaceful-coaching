import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileText, Sparkles, List, ClipboardList, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useContextualSummaries } from "@/hooks/useContextualSummaries";

interface DialogueMessage {
  id: string;
  speaker: 'therapist' | 'client' | 'unknown';
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface DialogueTranscriptProps {
  messages: DialogueMessage[];
  onCopyMessage?: (text: string) => void;
  onUseMessage?: (text: string) => void;
}

export const DialogueTranscript = ({ 
  messages, 
  onCopyMessage, 
  onUseMessage 
}: DialogueTranscriptProps) => {
  const { summaries, isGenerating, generateContextualSummary, removeSummary, clearAllSummaries } = useContextualSummaries(messages);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'therapist': return 'bg-primary/10 border-primary/20 text-primary-foreground';
      case 'client': return 'bg-secondary/10 border-secondary/20 text-secondary-foreground';
      default: return 'bg-muted/50 border-muted text-muted-foreground';
    }
  };

  const getSpeakerAlign = (speaker: string) => {
    return speaker === 'therapist' ? 'justify-start' : 'justify-end';
  };

  const getSummaryTypeColor = (type: string) => {
    switch (type) {
      case 'contextual': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'key_points': return 'bg-green-50 border-green-200 text-green-800';
      case 'therapeutic_notes': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSummaryTypeLabel = (type: string) => {
    switch (type) {
      case 'contextual': return 'Résumé contextuel';
      case 'key_points': return 'Points clés';
      case 'therapeutic_notes': return 'Notes thérapeutiques';
      default: return 'Résumé';
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Message copié dans le presse-papier"
      });
      onCopyMessage?.(text);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le message",
        variant: "destructive"
      });
    }
  };

  const handleUse = (text: string) => {
    onUseMessage?.(text);
    toast({
      title: "Appliqué",
      description: "Message appliqué à la séance"
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun dialogue détecté</p>
          <p className="text-xs">Transcrivez un audio stéréo pour voir la séparation automatique</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Action bar */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateContextualSummary(0, Math.min(4, messages.length - 1), 'contextual')}
              disabled={isGenerating}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Résumé début
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateContextualSummary(Math.max(0, messages.length - 5), messages.length - 1, 'key_points')}
              disabled={isGenerating}
              className="text-xs"
            >
              <List className="h-3 w-3 mr-1" />
              Points clés récents
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateContextualSummary(0, messages.length - 1, 'therapeutic_notes')}
              disabled={isGenerating}
              className="text-xs"
            >
              <ClipboardList className="h-3 w-3 mr-1" />
              Notes thérapeutiques
            </Button>
          </div>
          {summaries.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAllSummaries}
              className="text-xs text-muted-foreground"
            >
              Effacer résumés
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {/* Render summaries and messages in chronological order */}
          {messages.map((message, index) => (
            <div key={`group-${index}`}>
              {/* Render any summaries that end at this message */}
              {summaries
                .filter(summary => summary.toMessage === index)
                .map(summary => (
                  <div key={summary.id} className="mb-3">
                    <Card className={`p-4 ${getSummaryTypeColor(summary.type)} border-2`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getSummaryTypeLabel(summary.type)}
                          </Badge>
                          <span className="text-xs opacity-75">
                            Messages {summary.fromMessage + 1}-{summary.toMessage + 1}
                          </span>
                          {summary.isGenerating && (
                            <Badge variant="outline" className="text-xs animate-pulse">
                              Génération...
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSummary(summary.id)}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {summary.content}
                      </div>
                    </Card>
                  </div>
                ))}

              {/* Render the message */}
              <div className={`flex w-full ${getSpeakerAlign(message.speaker)}`}>
                <div className={`max-w-[80%] ${message.speaker === 'client' ? 'order-2' : 'order-1'}`}>
                  <Card className={`p-3 ${getSpeakerColor(message.speaker)}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={message.speaker === 'unknown' ? 'outline' : 'secondary'} className="text-xs">
                          {message.speaker === 'therapist' ? 'Thérapeute' : 
                           message.speaker === 'client' ? 'Client' : 'Inconnu'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.start)} - {formatTime(message.end)}
                        </span>
                        {message.confidence < 0.7 && (
                          <Badge variant="outline" className="text-xs">
                            Conf: {Math.round(message.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(message.text)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUse(message.text)}
                          className="h-6 w-6 p-0"
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </Card>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};