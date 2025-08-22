import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";

export const Header = () => {
  const { user, signOut } = useAuth();

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
          {user && (
            <>
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