import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChildTabs } from "./ChildTabs";
import { QuickSearch } from "./QuickSearch";

export const JourView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const clientId = searchParams.get('clientId');
  const childTab = searchParams.get('childTab') || 'calendar';

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
      {/* Sélecteur de recherche patient */}
      <div className="h-14 border-b border-border bg-card px-4 flex items-center">
        <div className="w-96">
          <QuickSearch onClientSelect={handleClientSelect} />
        </div>
      </div>

      {/* Zone centrale avec onglets enfants */}
      <div className="flex-1 overflow-hidden">
        <ChildTabs 
          clientId={clientId}
          activeChildTab={childTab}
          onChildTabChange={handleChildTabChange}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>
    </div>
  );
};