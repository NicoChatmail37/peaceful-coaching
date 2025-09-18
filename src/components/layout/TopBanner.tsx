import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonthlyCalendar } from "../agenda/MonthlyCalendar";
import { DailyAppointmentsList } from "../agenda/DailyAppointmentsList";
import { ClientHeader } from "./ClientHeader";
import { AppointmentDialog } from "../agenda/AppointmentDialog";
import { useAppointments } from "@/hooks/useAppointments";

interface TopBannerProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const TopBanner = ({ 
  selectedClientId, 
  onClientSelect, 
  selectedDate, 
  onDateChange 
}: TopBannerProps) => {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const { appointments } = useAppointments();

  return (
    <div className="h-full grid grid-cols-12 gap-2 p-2">
      {/* Zone gauche : Calendrier mensuel */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardContent className="p-2 h-full overflow-auto">
            <MonthlyCalendar
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              appointments={appointments}
            />
          </CardContent>
        </Card>
      </div>

      {/* Zone centre : RDV du jour sélectionné */}
      <div className="col-span-3">
        <Card className="h-full">
          <CardContent className="p-2 h-full">
            <DailyAppointmentsList
              selectedDate={selectedDate}
              appointments={appointments}
              onNewAppointment={() => setShowAppointmentDialog(true)}
              onSelectAppointment={(appointment) => onClientSelect(appointment.client_id)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Zone droite : Fiche patient active élargie */}
      <div className="col-span-5">
        {selectedClientId ? (
          <Card className="h-full">
            <CardContent className="p-2 h-full">
              <ClientHeader 
                clientId={selectedClientId} 
                onTakeAppointment={() => setShowAppointmentDialog(true)}
                expanded={true}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-2xl">👤</div>
                <h3 className="text-base font-medium">Sélectionnez un patient</h3>
                <p className="text-xs">Cliquez sur un RDV pour voir la fiche patient</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog pour prendre RDV */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        onSuccess={() => setShowAppointmentDialog(false)}
      />
    </div>
  );
};