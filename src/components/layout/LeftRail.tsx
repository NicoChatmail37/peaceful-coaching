import { TodayCalendar } from "./TodayCalendar";
import { TodayAppointmentsList } from "./TodayAppointmentsList";
import { QuickSearch } from "./QuickSearch";

interface LeftRailProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
}

export const LeftRail = ({ selectedClientId, onClientSelect }: LeftRailProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Recherche rapide */}
      <div className="p-4 border-b border-border">
        <QuickSearch onClientSelect={onClientSelect} />
      </div>

      {/* Mini-calendrier */}
      <div className="p-4 border-b border-border">
        <TodayCalendar />
      </div>

      {/* Liste des RDV du jour */}
      <div className="flex-1 overflow-hidden">
        <TodayAppointmentsList 
          selectedClientId={selectedClientId}
          onClientSelect={onClientSelect}
        />
      </div>
    </div>
  );
};