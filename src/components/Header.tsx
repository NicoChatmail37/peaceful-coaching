import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { CompanySelector } from "@/components/CompanySelector";
import { LogOut, User } from "lucide-react";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { activeCompany } = useCompany();

  return (
    <header 
      className="bg-card border-b shadow-soft"
      style={{ 
        borderBottomColor: activeCompany?.theme_color + '20' || undefined,
        borderBottomWidth: '2px'
      }}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ 
              background: activeCompany?.theme_color || '#0070f3',
              boxShadow: `0 0 20px ${activeCompany?.theme_color || '#0070f3'}40`
            }}
          >
            <span className="text-2xl">🇨🇭</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              SwissInvoice
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                by Peaceful Code
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">Facturation professionnelle</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {user && (
            <>
              <CompanySelector />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};