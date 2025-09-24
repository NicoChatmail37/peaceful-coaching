import { CompanyManagement } from "@/components/CompanyManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Building, Save, Mail, AlertTriangle, Upload, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { 
  validateSwissIBAN, 
  validateSwissVAT, 
  validateSwissPhone, 
  validateSwissPostalCode, 
  validateEmail, 
  validateTextInput,
  sanitizeHTML 
} from "@/lib/validation";

export const EntrepriseTab = () => {
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Apply length limits and sanitization
    let sanitizedValue = value;
    if (field === 'email_template') {
      sanitizedValue = sanitizeHTML(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!formData.name.trim()) {
      errors.name = "Le nom de l'entreprise est requis";
    } else if (formData.name.length > 100) {
      errors.name = "Le nom ne peut dépasser 100 caractères";
    }

    if (!formData.address.trim()) {
      errors.address = "L'adresse est requise";
    } else if (formData.address.length > 200) {
      errors.address = "L'adresse ne peut dépasser 200 caractères";
    }

    if (!formData.iban.trim()) {
      errors.iban = "L'IBAN est requis";
    } else {
      const ibanValidation = validateSwissIBAN(formData.iban);
      if (!ibanValidation.isValid) {
        errors.iban = ibanValidation.message!;
      }
    }

    // NPA validation
    if (formData.npa.trim()) {
      const npaValidation = validateSwissPostalCode(formData.npa);
      if (!npaValidation.isValid) {
        errors.npa = npaValidation.message!;
      }
    }

    // Email validation
    if (formData.email.trim()) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        errors.email = emailValidation.message!;
      }
    }

    // Phone validation
    if (formData.phone.trim()) {
      const phoneValidation = validateSwissPhone(formData.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.message!;
      }
    }

    // VAT validation
    if (formData.tva_number.trim()) {
      const vatValidation = validateSwissVAT(formData.tva_number);
      if (!vatValidation.isValid) {
        errors.tva_number = vatValidation.message!;
      }
    }

    // Text fields validation
    const textFields = [
      { field: 'city', maxLength: 50, name: 'La ville' },
      { field: 'email_template', maxLength: 2000, name: 'Le modèle d\'email' }
    ];

    textFields.forEach(({ field, maxLength, name }) => {
      if (formData[field as keyof typeof formData]) {
        const validation = validateTextInput(formData[field as keyof typeof formData] as string, maxLength, name);
        if (!validation.isValid) {
          errors[field] = validation.message!;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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

    if (!validateForm()) {
      toast({
        title: "Informations invalides",
        description: "Veuillez corriger les erreurs dans le formulaire",
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeCompany) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du logo ne doit pas dépasser 2MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format invalide",
        description: "Seuls les fichiers image sont acceptés",
        variant: "destructive"
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeCompany.id}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update company with logo URL
      await updateCompany(activeCompany.id, { logo_url: publicUrl });

      toast({
        title: "Logo téléchargé",
        description: "Le logo de votre entreprise a été mis à jour"
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le logo",
        variant: "destructive"
      });
    }
  };

  if (!activeCompany) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Entreprise</h2>
          <p className="text-muted-foreground">
            Gérez vos entreprises et configurez leurs informations
          </p>
        </div>
        
        <CompanyManagement />
        
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
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Entreprise</h2>
        <p className="text-muted-foreground">
          Gérez vos entreprises et configurez leurs informations
        </p>
      </div>
      
      {/* Section 1: Gestion des entreprises */}
      <CompanyManagement />
      
      {/* Section 2: Informations de l'entreprise */}
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
                maxLength={100}
                className={validationErrors.name ? 'border-destructive' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Adresse *</Label>
              <Input
                id="companyAddress"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rue de la Paix 123"
                maxLength={200}
                className={validationErrors.address ? 'border-destructive' : ''}
              />
              {validationErrors.address && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.address}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNPA">NPA *</Label>
              <Input
                id="companyNPA"
                value={formData.npa}
                onChange={(e) => handleInputChange('npa', e.target.value)}
                placeholder="1000"
                maxLength={4}
                className={validationErrors.npa ? 'border-destructive' : ''}
              />
              {validationErrors.npa && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.npa}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">Ville *</Label>
              <Input
                id="companyCity"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Lausanne"
                maxLength={50}
                className={validationErrors.city ? 'border-destructive' : ''}
              />
              {validationErrors.city && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.city}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Téléphone</Label>
              <Input
                id="companyPhone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+41 21 123 45 67"
                maxLength={20}
                className={validationErrors.phone ? 'border-destructive' : ''}
              />
              {validationErrors.phone && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.phone}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@monentreprise.ch"
                maxLength={254}
                className={validationErrors.email ? 'border-destructive' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {validationErrors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyIBAN">IBAN Suisse *</Label>
            <Input
              id="companyIBAN"
              value={formData.iban}
              onChange={(e) => handleInputChange('iban', e.target.value)}
              placeholder="CH93 0076 2011 6238 5295 7"
              maxLength={34}
              className={validationErrors.iban ? 'border-destructive' : ''}
            />
            {validationErrors.iban && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.iban}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyTVA">Numéro TVA (optionnel)</Label>
            <Input
              id="companyTVA"
              value={formData.tva_number}
              onChange={(e) => handleInputChange('tva_number', e.target.value)}
              placeholder="CHE-123.456.789 TVA"
              maxLength={20}
              className={validationErrors.tva_number ? 'border-destructive' : ''}
            />
            {validationErrors.tva_number && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.tva_number}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyLogo">Logo de l'entreprise</Label>
            <div className="flex items-center gap-4">
              {activeCompany?.logo_url && (
                <div className="flex-shrink-0">
                  <img 
                    src={activeCompany.logo_url} 
                    alt="Logo entreprise" 
                    className="w-16 h-16 object-contain border rounded"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="companyLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formats acceptés: JPG, PNG. Max 2MB. Recommandé: 200x200px
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-gradient-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder les informations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Modèle d'email pour les factures */}
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
              maxLength={2000}
              className={`min-h-32 ${validationErrors.email_template ? 'border-destructive' : ''}`}
            />
            {validationErrors.email_template && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {validationErrors.email_template}
              </p>
            )}
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

      {/* Section 4: Conseils pour les factures suisses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Conseils pour les factures suisses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>L'<strong>IBAN</strong> est obligatoire pour le QR-bill. Vérifiez qu'il est correct.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Le <strong>numéro TVA</strong> n'est requis que si vous êtes assujetti à la TVA (CA &gt; 100&apos;000 CHF/an).</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Le <strong>QR-bill</strong> remplace les bulletins de versement orange et rouge depuis 2020.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <p>Vérifiez que vos coordonnées sont complètes et exactes pour éviter les retards de paiement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};