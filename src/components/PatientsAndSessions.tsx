import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PatientsPanel } from "./patients/PatientsPanel";
import { TimelinePanel } from "./patients/TimelinePanel";
import { SessionWorkspace } from "./patients/SessionWorkspace";
import { AppointmentDialogForPatient } from "./patients/AppointmentDialogForPatient";
import { usePatients } from "@/hooks/usePatients";
import { useSessions } from "@/hooks/useSessions";
import { useUIPresets } from "@/hooks/useUIPresets";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { Client } from "@/hooks/useClients";
import { Session } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export const PatientsAndSessions = () => {
  const { selectedClient, setSelectedClient } = useSelectedClient();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const { patients, loading: patientsLoading } = usePatients();
  const { sessions, loading: sessionsLoading } = useSessions(selectedClient?.id);
  const { getLabel } = useUIPresets();

  // Use selectedClient from context as selectedPatient (backward compatibility)
  const selectedPatient = selectedClient;
  const setSelectedPatient = setSelectedClient;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Colonne gauche - Menu Patients */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              {getLabel('sessionLabel', 'Patients')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PatientsPanel
              patients={patients}
              loading={patientsLoading}
              selectedPatient={selectedPatient}
              onPatientSelect={setSelectedPatient}
            />
          </CardContent>
        </Card>
      </div>

      {/* Colonne centre - Timeline Patient */}
      <div className="lg:col-span-4">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Historique
              {selectedPatient && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {selectedPatient.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedPatient ? (
              <TimelinePanel
                patient={selectedPatient}
                sessions={sessions}
                loading={sessionsLoading}
                onSessionSelect={setActiveSession}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-lg font-medium">Sélectionnez un patient</h3>
                  <p className="text-sm">
                    Choisissez un patient dans la liste pour voir son historique
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Colonne droite - Workspace Séance */}
      <div className="lg:col-span-5">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✏️</span>
                {getLabel('sessionLabel', 'Séance')} active
              </div>
              {selectedPatient && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAppointmentDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Nouveau RDV
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeSession && selectedPatient ? (
              <SessionWorkspace
                session={activeSession}
                patient={selectedPatient}
                onSessionUpdate={(updatedSession) => {
                  setActiveSession(updatedSession);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium">Aucune séance active</h3>
                  <p className="text-sm">
                    {selectedPatient 
                      ? "Créez ou sélectionnez une séance dans l'historique"
                      : "Sélectionnez d'abord un patient"
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog pour nouveau rendez-vous */}
      <AppointmentDialogForPatient
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        patient={selectedPatient}
        onSuccess={() => setIsAppointmentDialogOpen(false)}
      />
    </div>
  );
};