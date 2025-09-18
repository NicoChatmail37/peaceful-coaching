import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, FolderOpen } from "lucide-react";
import { SessionsChildTab } from "./tabs/SessionsChildTab";
import { BillingChildTab } from "./tabs/BillingChildTab";
import { FilesChildTab } from "./tabs/FilesChildTab";

interface ChildTabsProps {
  clientId: string | null;
  activeChildTab: string;
  onChildTabChange: (tab: string) => void;
}

export const ChildTabs = ({ clientId, activeChildTab, onChildTabChange }: ChildTabsProps) => {
  return (
    <Tabs value={activeChildTab} onValueChange={onChildTabChange} className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border h-12 bg-muted/30">
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