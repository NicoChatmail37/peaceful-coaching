import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Upload, FileText } from "lucide-react";

interface FilesTabProps {
  clientId: string;
}

export const FilesTab = ({ clientId }: FilesTabProps) => {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documents du client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Gestion des fichiers</h3>
            <p className="text-sm mb-4">
              Cette fonctionnalité sera bientôt disponible pour gérer les documents du client.
            </p>
            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" />
              Télécharger un fichier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités prévues</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Téléchargement de documents (PDF, images, etc.)</li>
            <li>• Organisation par dossiers et catégories</li>
            <li>• Prévisualisation des fichiers</li>
            <li>• Partage sécurisé avec le client</li>
            <li>• Historique des versions</li>
            <li>• Intégration avec les séances et factures</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};