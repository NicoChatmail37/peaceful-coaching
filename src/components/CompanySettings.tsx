import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { Building, Save, Mail } from "lucide-react";
import { useEffect, useState } from "react";

export const CompanySettings = () => {
  const { toast } = useToast();
  const { activeCompany, updateCompany } = useCompany();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    npa: "",
    city: "",
    phone: "",
    email: "",
    iban: "",
    tva_number: "",
    email_template: ""
  });

  // Sync form data with active company
  useEffect(() => {
    if (activeCompany) {
      setFormData({
        name: activeCompany.name || "",
        address: activeCompany.address || "",
        npa: activeCompany.npa || "",
        city: activeCompany.city || "",
        phone: activeCompany.phone || "",
        email: activeCompany.email || "",
        iban: activeCompany.iban || "",
        tva_number: activeCompany.tva_number || "",
        email_template: activeCompany.email_template || "Bonjour,\n\nVeuillez trouver ci-joint votre facture.\n\nCordialement,\n{company_name}"
      });
    }
  }, [activeCompany]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!activeCompany) {
      toast({
        title: "Erreur",
        description: "Aucune entreprise sélectionnée",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name || !formData.iban) {
      toast({
        title: "Informations incomplètes",
        description: "Veuillez au minimum renseigner le nom de l'entreprise et l'IBAN.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateCompany(activeCompany.id, formData);
    } catch (error) {
      console.error('Error updating company:', error);
    }
  };

  const validateIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '');
    return cleaned.length >= 15 && cleaned.startsWith('CH');
  };

  if (!activeCompany) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucune entreprise sélectionnée</h3>
            <p className="text-muted-foreground">
              Créez ou sélectionnez une entreprise pour modifier ses informations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Informations de l'entreprise
          </CardTitle>
          <CardDescription>
            Entreprise active: <strong>{activeCompany.name}</strong> - Ces informations apparaîtront sur vos factures et dans le QR-bill
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Mon Entreprise SA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Adresse *</Label>
              <Input
                id="companyAddress"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rue de la Paix 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNPA">NPA *</Label>
              <Input
                id="companyNPA"
                value={formData.npa}
                onChange={(e) => handleInputChange('npa', e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">Ville *</Label>
              <Input
                id="companyCity"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Lausanne"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+41 21 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@monentreprise.ch"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyIBAN">IBAN Suisse *</Label>
            <Input
              id="companyIBAN"
              value={formData.iban}
              onChange={(e) => handleInputChange('iban', e.target.value)}
              placeholder="CH93 0076 2011 6238 5295 7"
              className={!validateIBAN(formData.iban) && formData.iban ? 'border-destructive' : ''}
            />
            {!validateIBAN(formData.iban) && formData.iban && (
              <p className="text-sm text-destructive">Format IBAN invalide (doit commencer par CH)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyTVA">Numéro TVA (optionnel)</Label>
            <Input
              id="companyTVA"
              value={formData.tva_number}
              onChange={(e) => handleInputChange('tva_number', e.target.value)}
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
            <Mail className="w-5 h-5" />
            Modèle d'email pour les factures
          </CardTitle>
          <CardDescription>
            Texte qui accompagnera vos factures lors de l'envoi par email. Utilisez {'{company_name}'} pour insérer le nom de votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailTemplate">Texte du message</Label>
            <Textarea
              id="emailTemplate"
              value={formData.email_template}
              onChange={(e) => handleInputChange('email_template', e.target.value)}
              placeholder="Bonjour,\n\nVeuillez trouver ci-joint votre facture.\n\nCordialement,\n{company_name}"
              rows={6}
              className="min-h-32"
            />
            <p className="text-sm text-muted-foreground">
              Ce texte sera utilisé comme contenu de l'email lors de l'envoi des factures.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-gradient-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder le modèle
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