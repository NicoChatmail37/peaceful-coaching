import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonthlyCalendar } from "@/components/agenda/MonthlyCalendar";
import { WeeklyView } from "@/components/agenda/WeeklyView";
import { ClientHeaderEditable } from "../ClientHeaderEditable";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { useAppointments } from "@/hooks/useAppointments";

interface CalendarPatientTabProps {
  clientId: string | null;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const CalendarPatientTab = ({ clientId, selectedDate, onDateChange }: CalendarPatientTabProps) => {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const { appointments } = useAppointments();

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setShowAppointmentDialog(true);
  };

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      {/* Partie haute : Calendrier + Vue semaine */}
      <div className="h-[40%] grid grid-cols-4 gap-2">
        {/* Calendrier mensuel - 1/4 */}
        <div className="col-span-1">
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

        {/* Vue semaine - 3/4 */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <WeeklyView
                selectedDate={selectedDate}
                appointments={appointments}
                onDateChange={onDateChange}
                onNewAppointment={handleNewAppointment}
                onEditAppointment={handleEditAppointment}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Partie basse : Fiche patient modifiable */}
      <div className="h-[60%]">
        {clientId ? (
          <Card className="h-full">
            <CardContent className="p-4 h-full overflow-auto">
              <ClientHeaderEditable 
                clientId={clientId}
                onTakeAppointment={() => setShowAppointmentDialog(true)}
                expanded={true}
                editable={true}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-4xl">👤</div>
                <h3 className="text-lg font-medium">Sélectionnez un patient</h3>
                <p className="text-sm">Choisissez un patient pour voir et modifier sa fiche</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog pour prendre RDV */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        appointment={editingAppointment}
        defaultDate={selectedDate}
        defaultClientId={clientId}
        onSuccess={() => setShowAppointmentDialog(false)}
      />
    </div>
  );
};
