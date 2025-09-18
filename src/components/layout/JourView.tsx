import { useSearchParams } from "react-router-dom";
import { TopBanner } from "./TopBanner";
import { ChildTabs } from "./ChildTabs";

export const JourView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
      {/* Bandeau fixe en haut - 2 zones */}
      <div className="h-32 border-b border-border bg-card">
        <TopBanner 
          selectedClientId={clientId}
          onClientSelect={handleClientSelect}
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