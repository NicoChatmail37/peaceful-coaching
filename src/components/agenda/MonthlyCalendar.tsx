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
    <div className="space-y-1">
      {/* Navigation du mois */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        
        <h3 className="text-xs font-medium">
          {format(selectedDate, 'MMM yyyy', { locale: fr })}
        </h3>
        
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
        {/* En-têtes des jours de la semaine */}
        {weekDays.map((day) => (
          <div key={day} className="bg-muted px-1 py-0.5 text-center">
            <div className="font-medium text-xs text-muted-foreground">
              {day.slice(0, 1)}
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
                "bg-background p-1 h-6 text-left hover:bg-accent/50 transition-colors border-none relative",
                !isCurrentMonth && "opacity-50",
                isSelected && "ring-1 ring-primary ring-inset",
                isDayToday && "bg-primary/10"
              )}
            >
              <div className={cn(
                "text-xs font-medium",
                isDayToday && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
              
              {/* Points indicateurs de RDV */}
              {dayAppointments.length > 0 && (
                <div className="absolute bottom-0.5 left-1 flex gap-0.5">
                  {Array.from({ length: Math.min(dayAppointments.length, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-primary"
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};