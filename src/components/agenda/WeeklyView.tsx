import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  title?: string;
  client_id: string;
  client_name?: string;
}

interface WeeklyViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onNewAppointment?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
}

export const WeeklyView = ({
  selectedDate,
  appointments,
  onDateChange,
  onNewAppointment,
  onSelectAppointment,
  onEditAppointment
}: WeeklyViewProps) => {
  // Synchroniser weekStart avec selectedDate
  const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  
  // Mettre à jour weekStart quand selectedDate change
  if (!isSameWeek(weekStart, selectedDate, { weekStartsOn: 1 })) {
    setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  }
  
  const daysToShow = 7; // Afficher 7 jours (du lundi au dimanche)

  const weekDays = Array.from({ length: daysToShow }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.starts_at);
      return isSameDay(aptDate, day);
    }).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  };

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousWeek}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="font-medium text-sm">
          Semaine du {format(weekStart, "d MMM", { locale: fr })}
        </h3>
        
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onNewAppointment && (
            <Button
              variant="default"
              size="icon"
              onClick={onNewAppointment}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Grille des jours */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 gap-1 p-2">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <Card
                key={day.toISOString()}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "border-primary ring-1 ring-primary" : ""
                } ${isToday ? "bg-accent/50" : ""}`}
                onClick={() => onDateChange(day)}
              >
                <CardContent className="p-2">
                  <div className="text-center mb-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE", { locale: fr })}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                  </div>

                   <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {dayAppointments.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Aucun RDV
                      </div>
                    ) : (
                      <>
                        {dayAppointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="text-xs p-1.5 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer border border-primary/20 group"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectAppointment) {
                                onSelectAppointment(apt);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {format(new Date(apt.starts_at), "HH:mm")}
                                </div>
                                <div className="truncate text-muted-foreground">
                                  {apt.client_name}
                                </div>
                                {apt.title && (
                                  <div className="truncate text-xs">
                                    {apt.title}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-center text-xs text-muted-foreground py-1">
                            {dayAppointments.length} rendez-vous
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
