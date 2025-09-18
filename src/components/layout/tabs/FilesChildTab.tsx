import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, Download, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilesChildTabProps {
  clientId: string | null;
}

export const FilesChildTab = ({ clientId }: FilesChildTabProps) => {
  // Mock file data - replace with real implementation
  const files = [
    { id: '1', name: 'Rapport_initial.pdf', size: '256 KB', date: '2024-01-15', type: 'pdf' },
    { id: '2', name: 'Photo_document.jpg', size: '1.2 MB', date: '2024-01-10', type: 'image' },
  ];

  if (!clientId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <File className="h-12 w-12 mx-auto opacity-50" />
          <h3 className="text-lg font-medium">Aucun patient sélectionné</h3>
          <p className="text-sm">Sélectionnez un patient pour voir ses fichiers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="space-y-6">
        {/* Upload section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Télécharger des fichiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
              </p>
              <Button>
                Sélectionner des fichiers
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Files list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fichiers du patient</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size} • {new Date(file.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {files.length === 0 && (
                  <div className="text-center py-8">
                    <File className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun fichier pour ce patient
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};