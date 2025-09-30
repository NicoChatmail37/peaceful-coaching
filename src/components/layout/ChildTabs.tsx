import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, FileText, FolderOpen } from "lucide-react";
import { CalendarPatientTab } from "./tabs/CalendarPatientTab";
import { SessionsChildTab } from "./tabs/SessionsChildTab";
import { BillingChildTab } from "./tabs/BillingChildTab";
import { FilesChildTab } from "./tabs/FilesChildTab";

interface ChildTabsProps {
  clientId: string | null;
  activeChildTab: string;
  onChildTabChange: (tab: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const ChildTabs = ({ clientId, activeChildTab, onChildTabChange, selectedDate, onDateChange }: ChildTabsProps) => {
  return (
    <Tabs value={activeChildTab} onValueChange={onChildTabChange} className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-border h-12 bg-muted/30">
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendrier et Fiche
        </TabsTrigger>
        <TabsTrigger value="sessions" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Séances
        </TabsTrigger>
        <TabsTrigger value="billing" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Facturation
        </TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Fichiers
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="calendar" className="h-full mt-0">
          <CalendarPatientTab 
            clientId={clientId}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
          />
        </TabsContent>

        <TabsContent value="sessions" className="h-full mt-0">
          <SessionsChildTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="billing" className="h-full mt-0">
          <BillingChildTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="files" className="h-full mt-0">
          <FilesChildTab clientId={clientId} />
        </TabsContent>
      </div>
    </Tabs>
  );
};