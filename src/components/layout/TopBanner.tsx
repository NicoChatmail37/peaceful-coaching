import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TodayCalendar } from "./TodayCalendar";
import { TodayAppointmentsList } from "./TodayAppointmentsList";
import { ClientHeader } from "./ClientHeader";
import { AppointmentDialog } from "../agenda/AppointmentDialog";
import { useState } from "react";

interface TopBannerProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
}

export const TopBanner = ({ selectedClientId, onClientSelect }: TopBannerProps) => {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  return (
    <div className="h-full grid grid-cols-12 gap-3 p-3">
      {/* Zone gauche : Mini-calendrier + RDV du jour */}
      <div className="col-span-3 space-y-3">
        <Card>
          <CardContent className="p-2">
            <TodayCalendar />
          </CardContent>
        </Card>
        
        <div className="flex-1 overflow-hidden">
          <TodayAppointmentsList 
            selectedClientId={selectedClientId}
            onClientSelect={onClientSelect}
          />
        </div>
      </div>

      {/* Zone centre élargie : Fiche patient active */}
      <div className="col-span-9">
        {selectedClientId ? (
          <Card className="h-full">
            <CardContent className="p-2 h-full">
              <ClientHeader 
                clientId={selectedClientId} 
                onTakeAppointment={() => setShowAppointmentDialog(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-2xl">👤</div>
                <h3 className="text-base font-medium">Sélectionnez un patient</h3>
                <p className="text-xs">Cliquez sur un RDV pour voir la fiche patient</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog pour prendre RDV */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        onSuccess={() => setShowAppointmentDialog(false)}
      />
    </div>
  );
};