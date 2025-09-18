import { useAppointments } from "@/hooks/useAppointments";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TodayAppointmentsListProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
}

export const TodayAppointmentsList = ({ selectedClientId, onClientSelect }: TodayAppointmentsListProps) => {
  const { appointments, loading } = useAppointments();

  const todayAppointments = appointments.filter(apt => 
    isToday(new Date(apt.starts_at))
  ).sort((a, b) => 
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/10 text-success';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-warning/10 text-warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return 'Planifié';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-3 bg-muted/60 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          RDV d'aujourd'hui ({todayAppointments.length})
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun RDV aujourd'hui</p>
            </div>
          ) : (
            todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => onClientSelect(appointment.client_id)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-soft",
                  selectedClientId === appointment.client_id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {appointment.client_name || 'Client sans nom'}
                    </span>
                    <Badge variant="secondary" className={getStatusColor(appointment.status)}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(appointment.starts_at), 'HH:mm', { locale: fr })} - 
                    {format(new Date(appointment.ends_at), 'HH:mm', { locale: fr })}
                  </div>
                  
                  {appointment.title && (
                    <div className="text-xs text-muted-foreground">
                      {appointment.title}
                    </div>
                  )}
                  
                  {appointment.location && (
                    <div className="text-xs text-muted-foreground">
                      📍 {appointment.location}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};