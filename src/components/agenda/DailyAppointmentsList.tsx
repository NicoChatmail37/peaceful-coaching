import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import { AppointmentWithClient } from "@/hooks/useAppointments";

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
  
  // Filtrer les RDV pour la date sélectionnée
  const dayAppointments = appointments.filter(appointment => 
    isSameDay(parseISO(appointment.starts_at), selectedDate)
  ).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Prévu';
      case 'done': return 'Terminé';
      case 'canceled': return 'Annulé';
      case 'no_show': return 'Absent';
      default: return status;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm">
            {format(selectedDate, 'EEE d MMM', { locale: fr })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {dayAppointments.length} RDV
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onNewAppointment}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Liste des RDV */}
      <div className="flex-1 overflow-auto space-y-2">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun RDV ce jour</p>
          </div>
        ) : (
          dayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onSelectAppointment?.(appointment)}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="font-medium text-sm truncate">
                  {appointment.client_name}
                </div>
                <Badge variant="outline" className={`text-xs ${getStatusColor(appointment.status)}`}>
                  {getStatusLabel(appointment.status)}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(appointment.starts_at), 'HH:mm', { locale: fr })} - 
                  {format(parseISO(appointment.ends_at), 'HH:mm', { locale: fr })}
                </div>
                {appointment.title && (
                  <div className="mt-1 truncate">{appointment.title}</div>
                )}
                {appointment.location && (
                  <div className="mt-1 truncate">📍 {appointment.location}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};