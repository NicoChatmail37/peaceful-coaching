-- Ajouter un abonnement coaching pour l'entreprise qui n'en a pas
INSERT INTO app_subscriptions (company_id, app_name, status, subscribed_at)
SELECT c.id, 'coaching', 'active', now()
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM app_subscriptions sub 
  WHERE sub.company_id = c.id AND sub.app_name = 'coaching'
);