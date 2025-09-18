import { useState } from "react";
import { MonthlyCalendar } from "@/components/agenda/MonthlyCalendar";
import { useAppointments } from "@/hooks/useAppointments";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";

interface RightPaneProps {
  clientId: string | null;
}

export const RightPane = ({ clientId }: RightPaneProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointmentMode, setAppointmentMode] = useState(false);
  const { appointments } = useAppointments();

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleNewAppointment = () => {
    if (clientId && appointmentMode) {
      // TODO: Créer le RDV pour le client sélectionné à la date/heure choisie
      console.log('Créer RDV pour client:', clientId, 'à la date:', selectedDate);
      setAppointmentMode(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </h3>
          
          {clientId && (
            <Button
              size="sm"
              variant={appointmentMode ? "default" : "outline"}
              onClick={() => setAppointmentMode(!appointmentMode)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {appointmentMode ? "Confirmer" : "Nouveau RDV"}
            </Button>
          )}
        </div>
        
        {appointmentMode && clientId && (
          <div className="mt-2 p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-primary">
              Mode création RDV activé - Double-cliquez sur un créneau
            </p>
          </div>
        )}
      </div>

      {/* Calendrier */}
      <div className="flex-1 overflow-auto p-4">
        <MonthlyCalendar
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          appointments={appointments}
        />
      </div>

      {/* Actions supplémentaires */}
      {appointmentMode && clientId && (
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={handleNewAppointment}
            >
              Confirmer le rendez-vous
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setAppointmentMode(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};