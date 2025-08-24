import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCompany, Company } from "@/hooks/useCompany";
import { useForm } from "react-hook-form";
import { Building, Plus, Edit, Trash2, Save, Palette } from "lucide-react";

interface CompanyForm {
  name: string;
  address: string;
  npa: string;
  city: string;
  phone: string;
  email: string;
  iban: string;
  tva_number: string;
  theme_color: string;
}

const themeColors = [
  '#0070f3', '#7c3aed', '#10b981', '#f59e0b', 
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16',
  '#f97316', '#ec4899', '#6366f1', '#14b8a6'
];

export const CompanyManagement = () => {
  const { companies, activeCompany, createCompany, updateCompany, deleteCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CompanyForm>({
    defaultValues: {
      theme_color: '#0070f3'
    }
  });

  const selectedColor = watch('theme_color');

  const onSubmit = async (data: CompanyForm) => {
    if (editingCompany) {
      await updateCompany(editingCompany.id, data);
    } else {
      await createCompany({
        ...data,
        is_active: companies.length === 0
      });
    }
    
    setIsDialogOpen(false);
    setEditingCompany(null);
    reset();
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setValue('name', company.name);
    setValue('address', company.address || '');
    setValue('npa', company.npa || '');
    setValue('city', company.city || '');
    setValue('phone', company.phone || '');
    setValue('email', company.email || '');
    setValue('iban', company.iban || '');
    setValue('tva_number', company.tva_number || '');
    setValue('theme_color', company.theme_color);
    setIsDialogOpen(true);
  };

  const handleDelete = async (company: Company) => {
    await deleteCompany(company.id);
  };

  const resetForm = () => {
    setEditingCompany(null);
    reset({
      name: '',
      address: '',
      npa: '',
      city: '',
      phone: '',
      email: '',
      iban: '',
      tva_number: '',
      theme_color: '#0070f3'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Gestion des entreprises
              </CardTitle>
              <CardDescription>
                Gérez vos entreprises et définissez celle qui est active
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle entreprise
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
                  </DialogTitle>
                  <DialogDescription>
                    Renseignez les informations de votre entreprise
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom de l'entreprise *</Label>
                      <Input
                        id="name"
                        {...register('name', { required: 'Le nom est requis' })}
                        placeholder="Mon Entreprise SA"
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        {...register('address')}
                        placeholder="Rue de la Paix 123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="npa">NPA</Label>
                      <Input
                        id="npa"
                        {...register('npa')}
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="Lausanne"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="+41 21 123 45 67"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="contact@monentreprise.ch"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN Suisse</Label>
                    <Input
                      id="iban"
                      {...register('iban')}
                      placeholder="CH93 0076 2011 6238 5295 7"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tva_number">Numéro TVA</Label>
                    <Input
                      id="tva_number"
                      {...register('tva_number')}
                      placeholder="CHE-123.456.789 TVA"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Couleur du thème
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {themeColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setValue('theme_color', color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            selectedColor === color 
                              ? 'border-foreground scale-110' 
                              : 'border-muted hover:border-muted-foreground'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      {...register('theme_color')}
                      className="w-full h-10 rounded-lg border border-input"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      {editingCompany ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune entreprise</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre première entreprise pour commencer
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div key={company.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: company.theme_color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{company.name}</h3>
                          {company.id === activeCompany?.id && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        {company.address && (
                          <p className="text-sm text-muted-foreground">
                            {company.address}, {company.npa} {company.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(company)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {companies.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer l'entreprise</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer l'entreprise "{company.name}" ? 
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(company)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};