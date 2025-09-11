import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, Users } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useUIPresets } from "@/hooks/useUIPresets";
import { AgendaCalendar } from "./agenda/AgendaCalendar";
import { AppointmentsList } from "./agenda/AppointmentsList";
import { UninvoicedAppointments } from "./agenda/UninvoicedAppointments";
import { AppointmentDialog } from "./agenda/AppointmentDialog";

export const Agenda = () => {
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getLabel } = useUIPresets();

  // Calculer les dates de début et fin selon la vue
  const getDateRange = () => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    switch (currentView) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek + 1); // Lundi
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6); // Dimanche
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();
  const { appointments, loading } = useAppointments(start, end);

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            {getLabel('agendaLabel', 'Agenda')}
          </h1>
          <p className="text-muted-foreground">
            Gérez vos rendez-vous et convertissez-les en séances
          </p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rendez-vous
        </Button>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="uninvoiced" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            À facturer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vue calendrier</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={currentView === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentView('day')}
                  >
                    Jour
                  </Button>
                  <Button
                    variant={currentView === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentView('week')}
                  >
                    Semaine
                  </Button>
                  <Button
                    variant={currentView === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentView('month')}
                  >
                    Mois
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AgendaCalendar
                view={currentView}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                appointments={appointments}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Liste des rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentsList
                appointments={appointments}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uninvoiced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendez-vous à facturer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rendez-vous terminés qui n'ont pas encore été facturés
              </p>
            </CardHeader>
            <CardContent>
              <UninvoicedAppointments />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour créer un rendez-vous */}
      <AppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        appointment={null}
        defaultDate={selectedDate}
        onSuccess={() => setIsDialogOpen(false)}
      />
    </div>
  );
};