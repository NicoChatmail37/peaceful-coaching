import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/OverviewTab";
import { SessionsTab } from "./tabs/SessionsTab";
import { BillingTab } from "./tabs/BillingTab";
import { FilesTab } from "./tabs/FilesTab";
import { Eye, Clock, FileText, FolderOpen } from "lucide-react";

interface ClientTabsProps {
  clientId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ClientTabs = ({ clientId, activeTab, onTabChange }: ClientTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-border h-12">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Vue d'ensemble
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
        <TabsContent value="overview" className="h-full mt-0">
          <OverviewTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="sessions" className="h-full mt-0">
          <SessionsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="billing" className="h-full mt-0">
          <BillingTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="files" className="h-full mt-0">
          <FilesTab clientId={clientId} />
        </TabsContent>
      </div>
    </Tabs>
  );
};