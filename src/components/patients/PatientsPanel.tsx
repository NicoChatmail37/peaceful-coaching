import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Mail, Phone } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { PatientDialog } from "./PatientDialog";

interface PatientsPanelProps {
  patients: Client[];
  loading: boolean;
  selectedPatient: Client | null;
  onPatientSelect: (patient: Client) => void;
}

export const PatientsPanel = ({
  patients,
  loading,
  selectedPatient,
  onPatientSelect
}: PatientsPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header avec recherche et nouveau patient */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau patient
        </Button>
      </div>

      {/* Liste des patients */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {searchTerm ? "Aucun patient trouvé" : "Aucun patient enregistré"}
              </p>
              {!searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsDialogOpen(true)}
                  className="mt-2"
                >
                  Créer le premier patient
                </Button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onPatientSelect(patient)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                  selectedPatient?.id === patient.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-border-hover'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{patient.name}</h4>
                      {patient.city && (
                        <p className="text-xs text-muted-foreground">
                          {patient.npa} {patient.city}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedPatient?.id === patient.id && (
                    <Badge variant="secondary" className="text-xs">
                      Actif
                    </Badge>
                  )}
                </div>

                {(patient.email || patient.phone) && (
                  <div className="space-y-1">
                    {patient.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog pour créer/éditer un patient */}
      <PatientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        patient={null}
        onSuccess={() => setIsDialogOpen(false)}
      />
    </div>
  );
};