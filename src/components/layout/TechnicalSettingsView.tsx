import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Mic } from "lucide-react";
import { LLMSettings } from "@/components/LLMSettings";
import { IALocalSettings } from "@/components/transcription/IALocalSettings";

export const TechnicalSettingsView = () => {
  return (
    <div className="flex-1">
      <Tabs defaultValue="llm" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border h-12 bg-muted/30">
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            LLM Local
          </TabsTrigger>
          <TabsTrigger value="transcription" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Transcription
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="llm" className="h-full mt-0 p-6">
            <LLMSettings />
          </TabsContent>

          <TabsContent value="transcription" className="h-full mt-0 p-6">
            <IALocalSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};