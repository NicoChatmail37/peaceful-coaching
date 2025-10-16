import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAudioChunks } from "@/hooks/useAudioChunks";
import { User, UserCircle } from "lucide-react";

interface LiveDialogueViewProps {
  sessionId: string;
  clientId: string;
}

interface DialogueMessage {
  id: string;
  speaker: 'therapist' | 'client';
  text: string;
  start: number;
  end: number;
  timestamp: Date;
}

interface WhisperXSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

const parseWhisperXTranscript = (transcript: string): WhisperXSegment[] => {
  // Parse WhisperX format: "[00:00:00.000 -> 00:00:05.000] SPEAKER_00: texte..."
  const segments: WhisperXSegment[] = [];
  const lines = transcript.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // Match pattern: [timestamp] SPEAKER_XX: text
    const match = line.match(/\[([\d:.]+)\s*->\s*([\d:.]+)\]\s*(SPEAKER_\d+):\s*(.+)/);
    if (match) {
      const [, startStr, endStr, speaker, text] = match;
      segments.push({
        start: parseTimeToSeconds(startStr),
        end: parseTimeToSeconds(endStr),
        speaker,
        text: text.trim()
      });
    }
  }

  return segments;
};

const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(p => parseFloat(p));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const LiveDialogueView = ({ sessionId, clientId }: LiveDialogueViewProps) => {
  const { chunks } = useAudioChunks({ sessionId, clientId, autoRefresh: true });
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Convert transcribed chunks to dialogue messages
    const newMessages: DialogueMessage[] = [];

    for (const chunk of chunks) {
      if (chunk.transcribed && chunk.transcriptText) {
        const segments = parseWhisperXTranscript(chunk.transcriptText);
        
        for (const seg of segments) {
          newMessages.push({
            id: `${chunk.id}-${seg.start}`,
            speaker: seg.speaker === 'SPEAKER_00' ? 'therapist' : 'client',
            text: seg.text,
            start: seg.start,
            end: seg.end,
            timestamp: chunk.timestamp
          });
        }
      }
    }

    // Sort by timestamp and start time
    newMessages.sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.start - b.start;
    });

    setMessages(newMessages);
  }, [chunks]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
        <div className="text-center space-y-2">
          <div className="text-lg">Aucun dialogue transcrit</div>
          <div className="text-sm">
            Enregistrez et transcrivez pour voir la conversation apparaître ici
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-[500px]" ref={scrollRef}>
      <div className="space-y-3 p-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.speaker === 'therapist' ? 'justify-start' : 'justify-end'}`}
          >
            <Card 
              className={`max-w-[75%] p-3 ${
                message.speaker === 'therapist' 
                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                  : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {message.speaker === 'therapist' ? (
                  <UserCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    message.speaker === 'therapist' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  }`}
                >
                  {message.speaker === 'therapist' ? '👨‍⚕️ Thérapeute' : '🙋 Client'}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{message.text}</p>
            </Card>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
