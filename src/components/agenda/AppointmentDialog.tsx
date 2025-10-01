import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { format } from "date-fns";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultClientId?: string | null;
  onSuccess: () => void;
}

export const AppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultClientId,
  onSuccess
}: AppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    date: format(defaultDate || new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { patients } = usePatients();
  const { createAppointment, updateAppointment, deleteAppointment } = useAppointments();

  useEffect(() => {
    if (appointment) {
      const startDate = new Date(appointment.starts_at);
      const endDate = new Date(appointment.ends_at);
      
      setFormData({
        client_id: appointment.client_id,
        title: appointment.title || '',
        date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        location: appointment.location || ''
      });
    } else {
      setFormData({
        client_id: defaultClientId || '',
        title: '',
        date: format(defaultDate || new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
        location: ''
      });
    }
  }, [appointment, defaultDate, defaultClientId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.date || !formData.start_time || !formData.end_time) return;

    setLoading(true);
    
    try {
      const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}`);

      const appointmentData = {
        client_id: formData.client_id,
        title: formData.title || undefined,
        starts_at: startDateTime,
        ends_at: endDateTime,
        location: formData.location || undefined
      };

      const success = appointment 
        ? await updateAppointment(appointment.id, {
            ...appointmentData,
            starts_at: startDateTime.toISOString(),
            ends_at: endDateTime.toISOString()
          })
        : await createAppointment(appointmentData);

      if (success) {
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    
    setLoading(true);
    try {
      const success = await deleteAppointment(appointment.id);
      if (success) {
        onSuccess();
        onOpenChange(false);
        setShowDeleteConfirm(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </DialogTitle>
          <DialogDescription>
            {appointment 
              ? 'Modifiez les informations du rendez-vous ci-dessous.'
              : 'Programmez un nouveau rendez-vous avec un patient.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Patient */}
            <div>
              <Label htmlFor="client_id">Patient *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                      {patient.city && ` - ${patient.city}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titre */}
            <div>
              <Label htmlFor="title">Titre (optionnel)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Consultation, Suivi, etc."
              />
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* Horaires */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Heure de début *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">Heure de fin *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Lieu */}
            <div>
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Cabinet, domicile, téléconsultation..."
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1">
              {appointment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Annuler le rendez-vous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !formData.client_id || !formData.date}>
                {loading ? 'Sauvegarde...' : (appointment ? 'Modifier' : 'Créer')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le rendez-vous</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Non, garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Suppression...' : 'Oui, annuler'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};