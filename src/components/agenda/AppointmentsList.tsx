import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle, Clock, MapPin, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentWithClient, useAppointments } from "@/hooks/useAppointments";

interface AppointmentsListProps {
  appointments: AppointmentWithClient[];
  loading: boolean;
}

export const AppointmentsList = ({
  appointments,
  loading
}: AppointmentsListProps) => {
  const { convertToSession, updateAppointment } = useAppointments();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'done': return 'Terminé';
      case 'canceled': return 'Annulé';
      case 'no_show': return 'Absent';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'done': return 'default';
      case 'scheduled': return 'secondary';
      case 'canceled': return 'destructive';
      case 'no_show': return 'outline';
      default: return 'outline';
    }
  };

  const handleConvertToSession = async (appointmentId: string) => {
    const sessionId = await convertToSession(appointmentId);
    if (sessionId) {
      // Optionnel: rediriger vers la séance créée
      console.log('Session créée:', sessionId);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: 'done' | 'canceled' | 'no_show') => {
    await updateAppointment(appointmentId, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Aucun rendez-vous</h3>
        <p className="text-sm">
          Aucun rendez-vous programmé pour cette période
        </p>
      </div>
    );
  }

  // Grouper par date
  const appointmentsByDate = appointments.reduce((groups, appointment) => {
    const date = format(parseISO(appointment.starts_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, AppointmentWithClient[]>);

  return (
    <div className="space-y-6">
      {Object.entries(appointmentsByDate).map(([date, dayAppointments]) => (
        <div key={date}>
          <h3 className="font-semibold mb-3 text-lg">
            {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          
          <div className="space-y-3">
            {dayAppointments.map((appointment) => (
              <Card key={appointment.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{appointment.client_name}</span>
                        </div>
                        <Badge variant={getStatusVariant(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(appointment.starts_at), 'HH:mm')} - {format(parseISO(appointment.ends_at), 'HH:mm')}
                        </div>
                        {appointment.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {appointment.location}
                          </div>
                        )}
                      </div>

                      {appointment.title && (
                        <div className="text-sm">{appointment.title}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'done')}
                          >
                            Marquer terminé
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(appointment.id, 'canceled')}
                          >
                            Annuler
                          </Button>
                        </>
                      )}

                      {appointment.status === 'done' && !appointment.session_id && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToSession(appointment.id)}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Convertir en séance
                        </Button>
                      )}

                      {appointment.session_id && (
                        <Badge variant="outline" className="text-xs">
                          Séance créée
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};