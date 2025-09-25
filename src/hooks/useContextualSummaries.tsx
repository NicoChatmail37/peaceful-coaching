import { useState, useCallback } from 'react';
import { generateSummary, generateCustomAnalysis } from '@/lib/llmService';
import { toast } from '@/hooks/use-toast';

interface DialogueMessage {
  id: string;
  speaker: 'therapist' | 'client' | 'unknown';
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface ContextualSummary {
  id: string;
  timestamp: number;
  fromMessage: number;
  toMessage: number;
  type: 'contextual' | 'key_points' | 'therapeutic_notes';
  content: string;
  isGenerating?: boolean;
}

export function useContextualSummaries(messages: DialogueMessage[]) {
  const [summaries, setSummaries] = useState<ContextualSummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContextualSummary = useCallback(async (
    fromIndex: number, 
    toIndex: number, 
    type: 'contextual' | 'key_points' | 'therapeutic_notes' = 'contextual'
  ) => {
    if (fromIndex < 0 || toIndex >= messages.length || fromIndex > toIndex) {
      toast({
        title: "Erreur",
        description: "Sélection de messages invalide",
        variant: "destructive"
      });
      return;
    }

    const summaryId = `summary-${Date.now()}`;
    const selectedMessages = messages.slice(fromIndex, toIndex + 1);
    
    // Create placeholder summary
    const placeholderSummary: ContextualSummary = {
      id: summaryId,
      timestamp: Date.now(),
      fromMessage: fromIndex,
      toMessage: toIndex,
      type,
      content: "Génération du résumé en cours...",
      isGenerating: true
    };

    setSummaries(prev => [...prev, placeholderSummary]);
    setIsGenerating(true);

    try {
      // Format messages for LLM
      const dialogueText = selectedMessages
        .map(msg => `[${Math.floor(msg.start / 60)}:${String(Math.floor(msg.start % 60)).padStart(2, '0')}] ${
          msg.speaker === 'therapist' ? 'Thérapeute' : 
          msg.speaker === 'client' ? 'Client' : 'Locuteur'
        }: ${msg.text}`)
        .join('\n');

      let result: string;
      
      switch (type) {
        case 'contextual':
          result = await generateSummary(dialogueText, {
            onProgress: (chunk) => {
              setSummaries(prev => 
                prev.map(s => 
                  s.id === summaryId 
                    ? { ...s, content: s.content === "Génération du résumé en cours..." ? chunk : s.content + chunk }
                    : s
                )
              );
            }
          });
          break;
        
        case 'key_points':
          result = await generateCustomAnalysis(
            dialogueText, 
            "Extrais 3-5 points clés de ce dialogue thérapeutique sous forme de liste concise",
            {
              onProgress: (chunk) => {
                setSummaries(prev => 
                  prev.map(s => 
                    s.id === summaryId 
                      ? { ...s, content: s.content === "Génération du résumé en cours..." ? chunk : s.content + chunk }
                      : s
                  )
                );
              }
            }
          );
          break;
        
        case 'therapeutic_notes':
          result = await generateCustomAnalysis(
            dialogueText, 
            "Rédige des notes thérapeutiques professionnelles pour ce segment : observations, émotions exprimées, techniques utilisées, progrès observés",
            {
              onProgress: (chunk) => {
                setSummaries(prev => 
                  prev.map(s => 
                    s.id === summaryId 
                      ? { ...s, content: s.content === "Génération du résumé en cours..." ? chunk : s.content + chunk }
                      : s
                  )
                );
              }
            }
          );
          break;
      }

      // Update with final result
      setSummaries(prev => 
        prev.map(s => 
          s.id === summaryId 
            ? { ...s, content: result, isGenerating: false }
            : s
        )
      );

      toast({
        title: "Résumé généré",
        description: "Le résumé contextuel a été créé avec succès"
      });

    } catch (error) {
      console.error('Error generating summary:', error);
      
      setSummaries(prev => 
        prev.map(s => 
          s.id === summaryId 
            ? { ...s, content: "Erreur lors de la génération du résumé", isGenerating: false }
            : s
        )
      );

      toast({
        title: "Erreur",
        description: "Impossible de générer le résumé",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [messages]);

  const removeSummary = useCallback((summaryId: string) => {
    setSummaries(prev => prev.filter(s => s.id !== summaryId));
  }, []);

  const clearAllSummaries = useCallback(() => {
    setSummaries([]);
  }, []);

  return {
    summaries,
    isGenerating,
    generateContextualSummary,
    removeSummary,
    clearAllSummaries
  };
}