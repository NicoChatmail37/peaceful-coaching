import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppointments } from "@/hooks/useAppointments";
import { Client } from "@/hooks/useClients";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentDialogForPatientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Client | null;
  onSuccess: () => void;
}

export const AppointmentDialogForPatient = ({
  open,
  onOpenChange,
  patient,
  onSuccess
}: AppointmentDialogForPatientProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const { createAppointment } = useAppointments();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !patient) return;

    // Créer les dates avec les heures
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const starts_at = new Date(selectedDate);
    starts_at.setHours(startHour, startMinute, 0, 0);
    
    const ends_at = new Date(selectedDate);
    ends_at.setHours(endHour, endMinute, 0, 0);

    const success = await createAppointment({
      client_id: patient.id,
      title: title || undefined,
      starts_at,
      ends_at,
      location: location || undefined
    });

    if (success) {
      // Reset form
      setSelectedDate(undefined);
      setStartTime("09:00");
      setEndTime("10:00");
      setTitle("");
      setLocation("");
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Nouveau rendez-vous
            {patient && (
              <span className="text-sm font-normal text-muted-foreground">
                - {patient.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sélection de date */}
          <div className="space-y-2">
            <Label>Date du rendez-vous</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className={cn("rounded-md border pointer-events-auto")}
            />
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>

          {/* Heures */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Heure de début</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-time">Heure de fin</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Titre optionnel */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre (optionnel)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Consultation initiale"
            />
          </div>

          {/* Lieu optionnel */}
          <div className="space-y-2">
            <Label htmlFor="location">Lieu (optionnel)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Cabinet médical"
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!selectedDate || !patient}
            >
              Confirmer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};