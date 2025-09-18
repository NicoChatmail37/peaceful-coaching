import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBanner } from "./TopBanner";
import { ChildTabs } from "./ChildTabs";

export const JourView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const clientId = searchParams.get('clientId');
  const childTab = searchParams.get('childTab') || 'sessions';

  const handleClientSelect = (newClientId: string) => {
    setSearchParams({ clientId: newClientId, childTab });
  };

  const handleChildTabChange = (newChildTab: string) => {
    if (clientId) {
      setSearchParams({ clientId, childTab: newChildTab });
    } else {
      setSearchParams({ childTab: newChildTab });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-152px)]">
      {/* Bandeau fixe en haut - 3 zones */}
      <div className="h-48 border-b border-border bg-card">
        <TopBanner 
          selectedClientId={clientId}
          onClientSelect={handleClientSelect}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>

      {/* Zone centrale avec onglets enfants */}
      <div className="flex-1 overflow-hidden">
        <ChildTabs 
          clientId={clientId}
          activeChildTab={childTab}
          onChildTabChange={handleChildTabChange}
        />
      </div>
    </div>
  );
};