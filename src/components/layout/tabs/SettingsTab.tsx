import { CompanyManagement } from "@/components/CompanyManagement";
import { CompanySettings } from "@/components/CompanySettings";
import { LLMSettings } from "@/components/LLMSettings";

export const SettingsTab = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Paramètres</h2>
        <p className="text-muted-foreground">
          Configurez votre entreprise et vos préférences
        </p>
      </div>
      
      <CompanyManagement />
      <CompanySettings />
      <LLMSettings />
    </div>
  );
};