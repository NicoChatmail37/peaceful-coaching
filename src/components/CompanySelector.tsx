import { useState } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Palette } from 'lucide-react';
import { useForm } from 'react-hook-form';

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

export const CompanySelector = () => {
  const { companies, activeCompany, setActiveCompany, createCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CompanyForm>({
    defaultValues: {
      theme_color: '#0070f3'
    }
  });

  const onSubmit = async (data: CompanyForm) => {
    await createCompany({
      ...data,
      is_active: false,
    });
    reset();
    setIsDialogOpen(false);
  };

  const themeColors = [
    '#0070f3', '#ff4757', '#2ed573', '#ffa502', '#3742fa',
    '#ff6b81', '#7bed9f', '#70a1ff', '#5352ed', '#ff4757'
  ];

  return (
    <div className="flex items-center gap-3">
      {activeCompany && (
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 bg-card"
          style={{ borderColor: activeCompany.theme_color }}
        >
          <Building2 className="h-4 w-4" style={{ color: activeCompany.theme_color }} />
          <span className="font-medium text-sm">{activeCompany.name}</span>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Building2 className="h-4 w-4 mr-2" />
            {companies.length === 0 ? 'Créer une entreprise' : 'Gérer les entreprises'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des entreprises</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Liste des entreprises existantes */}
            {companies.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Entreprises existantes</h3>
                <div className="grid gap-3">
                  {companies.map((company) => (
                    <Card 
                      key={company.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        activeCompany?.id === company.id ? 'ring-2' : ''
                      }`}
                      style={{ 
                        borderColor: activeCompany?.id === company.id ? company.theme_color : undefined,
                        ...(activeCompany?.id === company.id && {
                          boxShadow: `0 0 0 2px ${company.theme_color}`
                        })
                      }}
                      onClick={() => setActiveCompany(company)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: company.theme_color }}
                            />
                            <div>
                              <p className="font-medium">{company.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {company.city && `${company.city}`}
                              </p>
                            </div>
                          </div>
                          {activeCompany?.id === company.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Formulaire de création */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Nouvelle entreprise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nom de l'entreprise *</Label>
                      <Input {...register('name', { required: true })} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input {...register('email')} type="email" />
                    </div>
                    <div>
                      <Label htmlFor="address">Adresse</Label>
                      <Input {...register('address')} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input {...register('phone')} />
                    </div>
                    <div>
                      <Label htmlFor="npa">NPA</Label>
                      <Input {...register('npa')} />
                    </div>
                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input {...register('city')} />
                    </div>
                    <div>
                      <Label htmlFor="iban">IBAN</Label>
                      <Input {...register('iban')} />
                    </div>
                    <div>
                      <Label htmlFor="tva_number">Numéro TVA</Label>
                      <Input {...register('tva_number')} />
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Couleur du thème
                    </Label>
                    <div className="flex gap-2 mt-2">
                      {themeColors.map((color) => (
                        <label key={color} className="cursor-pointer">
                          <input
                            type="radio"
                            value={color}
                            {...register('theme_color')}
                            className="sr-only"
                          />
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-muted hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer l'entreprise
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};