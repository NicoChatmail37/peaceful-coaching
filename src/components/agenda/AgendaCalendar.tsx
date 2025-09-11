import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentWithClient } from "@/hooks/useAppointments";

interface AgendaCalendarProps {
  view: 'month' | 'week' | 'day';
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointments: AppointmentWithClient[];
  loading: boolean;
}

export const AgendaCalendar = ({
  view,
  selectedDate,
  onDateChange,
  appointments,
  loading
}: AgendaCalendarProps) => {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    onDateChange(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'done': return 'bg-green-500';
      case 'canceled': return 'bg-red-500';
      case 'no_show': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getDateTitle = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: fr });
    }
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* En-têtes des jours */}
        {days.map((day) => (
          <div key={day.toISOString()} className="bg-background p-3 text-center">
            <div className="font-medium text-sm">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className="text-lg font-bold">
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Contenu des jours avec rendez-vous */}
        {days.map((day) => {
          const dayAppointments = appointments.filter(apt => 
            isSameDay(parseISO(apt.starts_at), day)
          );

          return (
            <div key={`content-${day.toISOString()}`} className="bg-background p-2 min-h-[200px]">
              <div className="space-y-1">
                {dayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-2 rounded border border-border hover:bg-accent/50 cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status)} mb-1`} />
                    <div className="text-xs font-medium truncate">
                      {format(parseISO(appointment.starts_at), 'HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {appointment.client_name}
                    </div>
                    {appointment.title && (
                      <div className="text-xs truncate">
                        {appointment.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = appointments.filter(apt => 
      isSameDay(parseISO(apt.starts_at), selectedDate)
    ).sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());

    return (
      <div className="space-y-3">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium">Aucun rendez-vous</h3>
            <p className="text-sm">
              Aucun rendez-vous programmé pour cette journée
            </p>
          </div>
        ) : (
          dayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full ${getStatusColor(appointment.status)}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{appointment.client_name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {appointment.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(appointment.starts_at), 'HH:mm')} - {format(parseISO(appointment.ends_at), 'HH:mm')}
                </div>
                {appointment.title && (
                  <div className="text-sm">{appointment.title}</div>
                )}
                {appointment.location && (
                  <div className="text-xs text-muted-foreground">📍 {appointment.location}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-semibold text-center flex-1">
          {getDateTitle()}
        </h3>
        
        <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Contenu selon la vue */}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
      {view === 'month' && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Vue mensuelle - À implémenter</p>
        </div>
      )}
    </div>
  );
};