import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useAppointments, AppointmentWithClient } from "@/hooks/useAppointments";
import { CreateInvoiceDialog } from "../patients/CreateInvoiceDialog";

export const UninvoicedAppointments = () => {
  const [uninvoiced, setUninvoiced] = useState<AppointmentWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithClient | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  
  const { getUninvoicedAppointments } = useAppointments();

  useEffect(() => {
    const fetchUninvoiced = async () => {
      setLoading(true);
      try {
        const data = await getUninvoicedAppointments();
        setUninvoiced(data);
      } finally {
        setLoading(false);
      }
    };

    fetchUninvoiced();
  }, []);

  const handleInvoiceAppointment = (appointment: AppointmentWithClient) => {
    setSelectedAppointment(appointment);
    setIsInvoiceDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (uninvoiced.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Aucun rendez-vous à facturer</h3>
        <p className="text-sm">
          Tous vos rendez-vous terminés ont été facturés
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {uninvoiced.length} rendez-vous terminé{uninvoiced.length > 1 ? 's' : ''} en attente de facturation
          </p>
          <Badge variant="outline">
            {uninvoiced.length} à facturer
          </Badge>
        </div>

        {uninvoiced.map((appointment) => (
          <Card key={appointment.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.client_name}</span>
                    </div>
                    <Badge variant="default">Terminé</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(appointment.starts_at), 'EEEE d MMMM yyyy', { locale: fr })}
                    </div>
                    <div>
                      {format(parseISO(appointment.starts_at), 'HH:mm')} - {format(parseISO(appointment.ends_at), 'HH:mm')}
                    </div>
                  </div>

                  {appointment.title && (
                    <div className="text-sm">{appointment.title}</div>
                  )}

                  {appointment.session_id && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Séance créée
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleInvoiceAppointment(appointment)}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Facturer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog pour créer la facture */}
      {selectedAppointment && (
        <CreateInvoiceDialog
          open={isInvoiceDialogOpen}
          onOpenChange={setIsInvoiceDialogOpen}
          // Créer un objet session temporaire à partir du rendez-vous
          session={{
            id: selectedAppointment.session_id || '',
            company_id: selectedAppointment.company_id,
            client_id: selectedAppointment.client_id,
            title: selectedAppointment.title,
            started_at: selectedAppointment.starts_at,
            ended_at: selectedAppointment.ends_at,
            status: 'done' as const,
            created_at: selectedAppointment.created_at,
            updated_at: selectedAppointment.updated_at
          }}
          patient={{
            id: selectedAppointment.client_id,
            name: selectedAppointment.client_name,
            email: selectedAppointment.client_email
          }}
          onSuccess={() => {
            setIsInvoiceDialogOpen(false);
            setSelectedAppointment(null);
            // Recharger la liste
            window.location.reload();
          }}
        />
      )}
    </>
  );
};