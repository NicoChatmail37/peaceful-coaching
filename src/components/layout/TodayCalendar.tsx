import { useState } from "react";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

export const TodayCalendar = () => {
  const [selectedDate] = useState(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Aujourd'hui</span>
      </div>
      
      <div className="text-center space-y-1">
        <div className="text-2xl font-bold text-foreground">
          {format(selectedDate, 'd', { locale: fr })}
        </div>
        <div className="text-sm text-muted-foreground">
          {format(selectedDate, 'EEEE', { locale: fr })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(selectedDate, 'MMMM yyyy', { locale: fr })}
        </div>
      </div>

      {isToday(selectedDate) && (
        <div className="text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
            Aujourd'hui
          </span>
        </div>
      )}
    </div>
  );
};