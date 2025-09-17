import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentWithClient } from "@/hooks/useAppointments";
import { Plus } from "lucide-react";

interface DailyAppointmentsListProps {
  selectedDate: Date;
  appointments: AppointmentWithClient[];
  onNewAppointment: () => void;
  onSelectAppointment?: (appointment: AppointmentWithClient) => void;
}

export const DailyAppointmentsList = ({ 
  selectedDate, 
  appointments, 
  onNewAppointment,
  onSelectAppointment
}: DailyAppointmentsListProps) => {
  const dayAppointments = appointments.filter(apt => 
    isSameDay(parseISO(apt.starts_at), selectedDate)
  ).sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'done': return 'bg-green-500';
      case 'canceled': return 'bg-red-500';
      case 'no_show': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'done': return 'Terminé';
      case 'canceled': return 'Annulé';
      case 'no_show': return 'Absent';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {dayAppointments.length} rendez-vous
          </p>
        </div>
        
        <Button size="sm" onClick={onNewAppointment}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau RDV
        </Button>
      </div>

      {/* Liste des rendez-vous */}
      <div className="space-y-3">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-sm">Aucun rendez-vous pour cette journée</p>
          </div>
        ) : (
          dayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <div className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium truncate">{appointment.client_name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(appointment.starts_at), 'HH:mm')} - {format(parseISO(appointment.ends_at), 'HH:mm')}
                </div>
                
                {appointment.title && (
                  <div className="text-sm mt-1">{appointment.title}</div>
                )}
                
                {appointment.location && (
                  <div className="text-xs text-muted-foreground mt-1">
                    📍 {appointment.location}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};