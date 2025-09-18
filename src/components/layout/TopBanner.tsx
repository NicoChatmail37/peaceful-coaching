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
    <div className="h-full grid grid-cols-12 gap-4 p-4">
      {/* Zone gauche : Mini-calendrier + RDV du jour */}
      <div className="col-span-3 space-y-4">
        <Card>
          <CardContent className="p-3">
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

      {/* Zone centre : Fiche patient active */}
      <div className="col-span-6">
        {selectedClientId ? (
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <ClientHeader clientId={selectedClientId} />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-4xl">👤</div>
                <h3 className="text-lg font-medium">Sélectionnez un patient</h3>
                <p className="text-sm">Cliquez sur un RDV pour voir la fiche patient</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Zone droite : Prendre RDV */}
      <div className="col-span-3">
        <Card className="h-full">
          <CardContent className="p-4 flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Planification</h3>
              <p className="text-sm text-muted-foreground mb-4">Gérer les rendez-vous</p>
            </div>
            
            <Button 
              onClick={() => setShowAppointmentDialog(true)}
              className="w-full"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Prendre RDV
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              <Badge variant="outline">45 min par défaut</Badge>
            </div>
          </CardContent>
        </Card>
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