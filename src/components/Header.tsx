import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="bg-card border-b shadow-soft">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-2xl">🇨🇭</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SwissInvoice</h1>
            <p className="text-sm text-muted-foreground">Facturation professionnelle</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            📊 Statistiques
          </Button>
          <Button size="sm" className="bg-gradient-primary hover:bg-primary/90">
            💾 Sauvegarder
          </Button>
        </div>
      </div>
    </header>
  );
};