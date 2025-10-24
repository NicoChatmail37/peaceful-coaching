-- Créer les policies RLS pour permettre l'upload de logos d'entreprise
-- Permettre aux utilisateurs authentifiés de télécharger leurs propres logos

-- Policy pour permettre l'upload de logos (INSERT)
CREATE POLICY "Les utilisateurs peuvent uploader leurs logos d'entreprise" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);

-- Policy pour permettre la mise à jour de logos (UPDATE)
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs logos d'entreprise" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);

-- Policy pour permettre la suppression de logos (DELETE)
CREATE POLICY "Les utilisateurs peuvent supprimer leurs logos d'entreprise" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);

-- Policy pour permettre la lecture des logos (SELECT) - public car le bucket est public
CREATE POLICY "Les logos sont accessibles publiquement" 
ON storage.objects 
FOR SELECT 
TO public
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = 'logos'
);