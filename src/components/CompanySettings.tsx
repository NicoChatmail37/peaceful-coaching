import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CompanyInfo } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { Building, Save } from "lucide-react";

interface CompanySettingsProps {
  companyInfo: CompanyInfo;
  onCompanyInfoChange: (info: CompanyInfo) => void;
}

export const CompanySettings = ({ companyInfo, onCompanyInfoChange }: CompanySettingsProps) => {
  const { toast } = useToast();

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    onCompanyInfoChange({
      ...companyInfo,
      [field]: value
    });
  };

  const handleSave = () => {
    if (!companyInfo.name || !companyInfo.iban) {
      toast({
        title: "Informations incomplètes",
        description: "Veuillez au minimum renseigner le nom de l'entreprise et l'IBAN.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Paramètres sauvegardés !",
      description: "Les informations de votre entreprise ont été mises à jour."
    });
  };

  const validateIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '');
    return cleaned.length >= 15 && cleaned.startsWith('CH');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Informations de l'entreprise
          </CardTitle>
          <CardDescription>
            Ces informations apparaîtront sur vos factures et dans le QR-bill
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                value={companyInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Mon Entreprise SA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Adresse *</Label>
              <Input
                id="companyAddress"
                value={companyInfo.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rue de la Paix 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNPA">NPA *</Label>
              <Input
                id="companyNPA"
                value={companyInfo.npa}
                onChange={(e) => handleInputChange('npa', e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">Ville *</Label>
              <Input
                id="companyCity"
                value={companyInfo.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Lausanne"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={companyInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+41 21 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@monentreprise.ch"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyIBAN">IBAN Suisse *</Label>
            <Input
              id="companyIBAN"
              value={companyInfo.iban}
              onChange={(e) => handleInputChange('iban', e.target.value)}
              placeholder="CH93 0076 2011 6238 5295 7"
              className={!validateIBAN(companyInfo.iban) && companyInfo.iban ? 'border-destructive' : ''}
            />
            {!validateIBAN(companyInfo.iban) && companyInfo.iban && (
              <p className="text-sm text-destructive">Format IBAN invalide (doit commencer par CH)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyTVA">Numéro TVA (optionnel)</Label>
            <Input
              id="companyTVA"
              value={companyInfo.tvaNumber}
              onChange={(e) => handleInputChange('tvaNumber', e.target.value)}
              placeholder="CHE-123.456.789 TVA"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-gradient-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder les paramètres
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Conseils pour les factures suisses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>L'IBAN est obligatoire pour générer un QR-bill conforme aux standards suisses</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Si vous êtes assujetti à la TVA, n'oubliez pas d'indiquer votre numéro TVA</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Les factures sont automatiquement calculées avec la TVA suisse de 7.7%</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Le QR-bill remplace les bulletins de versement depuis le 30 juin 2020</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};