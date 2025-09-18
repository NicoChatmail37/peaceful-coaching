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
      <div className="p-2">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-2 bg-muted/60 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border">
        <h3 className="font-medium text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" />
          RDV aujourd'hui ({todayAppointments.length})
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {todayAppointments.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <User className="h-4 w-4 mx-auto mb-1 opacity-50" />
              <p className="text-xs">Aucun RDV</p>
            </div>
          ) : (
            todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => onClientSelect(appointment.client_id)}
                className={cn(
                  "p-2 rounded border cursor-pointer transition-all hover:shadow-sm",
                  selectedClientId === appointment.client_id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs truncate">
                      {appointment.client_name || 'Client sans nom'}
                    </span>
                    <Badge variant="secondary" className={cn("text-xs py-0 px-1", getStatusColor(appointment.status))}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(appointment.starts_at), 'HH:mm', { locale: fr })} - 
                    {format(new Date(appointment.ends_at), 'HH:mm', { locale: fr })}
                  </div>
                  
                  {appointment.title && (
                    <div className="text-xs text-muted-foreground truncate">
                      {appointment.title}
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