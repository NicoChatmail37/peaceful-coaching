import { useState } from "react";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

export const TodayCalendar = () => {
  const [selectedDate] = useState(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <CalendarIcon className="h-3 w-3 text-primary" />
        <span className="font-medium text-xs">Aujourd'hui</span>
      </div>
      
      <div className="text-center space-y-0.5">
        <div className="text-lg font-bold text-foreground">
          {format(selectedDate, 'd', { locale: fr })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(selectedDate, 'EEE', { locale: fr })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(selectedDate, 'MMM yyyy', { locale: fr })}
        </div>
      </div>

      {isToday(selectedDate) && (
        <div className="text-center">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
            Aujourd'hui
          </span>
        </div>
      )}
    </div>
  );
};