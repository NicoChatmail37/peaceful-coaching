import { ClientHeader } from "./ClientHeader";
import { ClientTabs } from "./ClientTabs";

interface ClientPaneProps {
  clientId: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ClientPane = ({ clientId, activeTab, onTabChange }: ClientPaneProps) => {
  if (!clientId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="text-4xl">👤</div>
          <h3 className="text-lg font-medium">Sélectionnez un client</h3>
          <p className="text-sm">Cliquez sur un client dans la liste de gauche pour voir sa fiche</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ClientHeader clientId={clientId} />
      <div className="flex-1 overflow-hidden">
        <ClientTabs 
          clientId={clientId}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      </div>
    </div>
  );
};