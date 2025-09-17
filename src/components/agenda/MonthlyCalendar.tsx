import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, parseISO, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentWithClient } from "@/hooks/useAppointments";
import { cn } from "@/lib/utils";

interface MonthlyCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointments: AppointmentWithClient[];
}

export const MonthlyCalendar = ({
  selectedDate,
  onDateChange,
  appointments
}: MonthlyCalendarProps) => {
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Générer tous les jours à afficher (incluant les jours du mois précédent/suivant)
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Jours de la semaine
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-4">
      {/* Navigation du mois */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'MMMM yyyy', { locale: fr })}
          </h3>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
        </div>
        
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* En-têtes des jours de la semaine */}
        {weekDays.map((day) => (
          <div key={day} className="bg-muted p-3 text-center">
            <div className="font-medium text-sm text-muted-foreground">
              {day}
            </div>
          </div>
        ))}
        
        {/* Jours du mois */}
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);
          
          const dayAppointments = appointments.filter(apt => 
            isSameDay(parseISO(apt.starts_at), day)
          );

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={cn(
                "bg-background p-2 min-h-[100px] text-left hover:bg-accent/50 transition-colors border-none",
                !isCurrentMonth && "opacity-50",
                isSelected && "ring-2 ring-primary ring-inset",
                isDayToday && "bg-primary/10"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isDayToday && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
              
              {/* Indicateurs de rendez-vous */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      appointment.status === 'scheduled' && "bg-blue-100 text-blue-800",
                      appointment.status === 'done' && "bg-green-100 text-green-800",
                      appointment.status === 'canceled' && "bg-red-100 text-red-800",
                      appointment.status === 'no_show' && "bg-gray-100 text-gray-800"
                    )}
                  >
                    {format(parseISO(appointment.starts_at), 'HH:mm')} {appointment.client_name}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayAppointments.length - 2} autres
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};