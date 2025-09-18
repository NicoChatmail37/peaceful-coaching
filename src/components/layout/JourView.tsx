import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LeftRail } from "./LeftRail";
import { ClientPane } from "./ClientPane";
import { RightPane } from "./RightPane";

export const JourView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const activeTab = searchParams.get('tab') || 'overview';

  const handleClientSelect = (newClientId: string) => {
    setSearchParams({ clientId: newClientId, tab: activeTab });
  };

  const handleTabChange = (newTab: string) => {
    if (clientId) {
      setSearchParams({ clientId, tab: newTab });
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-120px)]">
      {/* Panneau Gauche - 320px */}
      <div className="w-80 border-r border-border bg-muted/30">
        <LeftRail 
          selectedClientId={clientId}
          onClientSelect={handleClientSelect}
        />
      </div>

      {/* Panneau Centre - Flexible */}
      <div className="flex-1 min-w-0">
        <ClientPane 
          clientId={clientId}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Panneau Droit - 400px */}
      <div className="w-96 border-l border-border bg-card">
        <RightPane clientId={clientId} />
      </div>
    </div>
  );
};