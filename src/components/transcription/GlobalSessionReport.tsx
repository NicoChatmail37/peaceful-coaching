import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Download, 
  Wand2, 
  Copy,
  Loader2
} from "lucide-react";
import { generateSummary, generateNotes, extractTodos } from "@/lib/llmService";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface GlobalSessionReportProps {
  transcript: string;
  notes: string;
  sessionTitle: string;
  patientName: string;
  sessionDate: string;
  className?: string;
}

interface ReportSection {
  title: string;
  content: string;
  isGenerating: boolean;
}

export const GlobalSessionReport = ({
  transcript,
  notes,
  sessionTitle,
  patientName,
  sessionDate,
  className
}: GlobalSessionReportProps) => {
  const [reportSections, setReportSections] = useState<{
    summary: ReportSection;
    keyPoints: ReportSection;
    therapeuticNotes: ReportSection;
    actionItems: ReportSection;
  }>({
    summary: { title: "Résumé global", content: "", isGenerating: false },
    keyPoints: { title: "Points importants", content: "", isGenerating: false },
    therapeuticNotes: { title: "Notes thérapeutiques", content: "", isGenerating: false },
    actionItems: { title: "Actions de suivi", content: "", isGenerating: false }
  });

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [fullReport, setFullReport] = useState("");

  const generateSection = async (sectionKey: keyof typeof reportSections, prompt: string) => {
    if (!transcript.trim()) {
      toast({
        title: "Aucun transcript",
        description: "Veuillez d'abord ajouter du contenu à transcrire",
        variant: "destructive"
      });
      return;
    }

    setReportSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], isGenerating: true }
    }));

    try {
      let result = '';
      
      if (sectionKey === 'summary') {
        result = await generateSummary(transcript);
      } else if (sectionKey === 'actionItems') {
        result = await extractTodos(transcript);
      } else if (sectionKey === 'therapeuticNotes') {
        result = await generateNotes(transcript);
      } else {
        // For keyPoints, use a custom analysis
        result = await generateSummary(transcript, {
          onProgress: (chunk) => {
            setReportSections(prev => ({
              ...prev,
              [sectionKey]: { 
                ...prev[sectionKey], 
                content: prev[sectionKey].content + chunk 
              }
            }));
          }
        });
      }

      setReportSections(prev => ({
        ...prev,
        [sectionKey]: { 
          ...prev[sectionKey], 
          content: result,
          isGenerating: false
        }
      }));

      toast({
        title: "Section générée",
        description: `${reportSections[sectionKey].title} créé avec succès`
      });

    } catch (error) {
      console.error(`Error generating ${sectionKey}:`, error);
      toast({
        title: "Erreur de génération",
        description: `Impossible de générer ${reportSections[sectionKey].title}`,
        variant: "destructive"
      });
    } finally {
      setReportSections(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], isGenerating: false }
      }));
    }
  };

  const generateCompleteReport = async () => {
    setIsGeneratingAll(true);

    try {
      // Generate all sections in parallel
      await Promise.all([
        generateSection('summary', 'Résume cette séance thérapeutique'),
        generateSection('keyPoints', 'Identifie les points clés de cette séance'),
        generateSection('therapeuticNotes', 'Génère des notes thérapeutiques professionnelles'),
        generateSection('actionItems', 'Extrais les actions de suivi et recommandations')
      ]);

      // Compile full report
      const compiledReport = `
# Rapport de Séance - ${sessionTitle}

**Patient:** ${patientName}
**Date:** ${sessionDate}

## ${reportSections.summary.title}
${reportSections.summary.content}

## ${reportSections.keyPoints.title}
${reportSections.keyPoints.content}

## ${reportSections.therapeuticNotes.title}
${reportSections.therapeuticNotes.content}

## ${reportSections.actionItems.title}
${reportSections.actionItems.content}

## Transcript Complet
${transcript}

## Notes de Séance
${notes}
      `.trim();

      setFullReport(compiledReport);

      toast({
        title: "Rapport complet généré",
        description: "Toutes les sections ont été analysées avec succès"
      });

    } catch (error) {
      console.error('Error generating complete report:', error);
      toast({
        title: "Erreur de génération",
        description: "Impossible de générer le rapport complet",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const exportToPDF = () => {
    if (!fullReport.trim()) {
      toast({
        title: "Aucun rapport",
        description: "Générez d'abord le rapport complet",
        variant: "destructive"
      });
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text('Rapport de Séance Thérapeutique', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Patient: ${patientName}`, 20, 30);
    doc.text(`Date: ${sessionDate}`, 20, 35);
    doc.text(`Titre: ${sessionTitle}`, 20, 40);

    // Content
    const lines = doc.splitTextToSize(fullReport, 170);
    let yPosition = 50;

    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 4;
    });

    // Save
    doc.save(`rapport-seance-${sessionDate.replace(/\//g, '-')}.pdf`);

    toast({
      title: "PDF exporté",
      description: "Rapport sauvegardé avec succès"
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Contenu copié dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le texte",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Rapport Global de Séance
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={generateCompleteReport}
            disabled={!transcript.trim() || isGeneratingAll}
            size="sm"
          >
            {isGeneratingAll ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1" />
            )}
            {isGeneratingAll ? "Génération..." : "Générer rapport"}
          </Button>
          
          <Button
            onClick={exportToPDF}
            disabled={!fullReport.trim()}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Individual sections */}
      <div className="grid gap-3">
        {Object.entries(reportSections).map(([key, section]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{section.title}</h4>
              <div className="flex gap-1">
                <Button
                  onClick={() => generateSection(key as keyof typeof reportSections, section.title)}
                  disabled={!transcript.trim() || section.isGenerating}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                >
                  {section.isGenerating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
                {section.content && (
                  <Button
                    onClick={() => copyToClipboard(section.content)}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <Textarea
              value={section.content}
              onChange={(e) => setReportSections(prev => ({
                ...prev,
                [key]: { ...prev[key], content: e.target.value }
              }))}
              placeholder={`${section.title} sera généré automatiquement...`}
              className="min-h-[80px] text-sm"
              disabled={section.isGenerating}
            />
          </div>
        ))}
      </div>

      {/* Full report preview */}
      {fullReport && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Aperçu du rapport complet</h4>
            <Badge variant="default" className="text-xs">
              {fullReport.length} caractères
            </Badge>
          </div>
          <Textarea
            value={fullReport}
            onChange={(e) => setFullReport(e.target.value)}
            className="min-h-[120px] text-xs font-mono"
            placeholder="Le rapport complet apparaîtra ici..."
          />
        </div>
      )}
    </Card>
  );
};