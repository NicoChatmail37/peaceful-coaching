-- Phase 3: Fix foreign key relationships and improve database integrity

-- Add foreign key constraints to enable Supabase auto-joins
ALTER TABLE invoice_appointments 
ADD CONSTRAINT fk_appointments_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoice_appointments 
ADD CONSTRAINT fk_appointments_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE invoice_sessions 
ADD CONSTRAINT fk_sessions_client_id 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoice_sessions 
ADD CONSTRAINT fk_sessions_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add indexes for better performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON invoice_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON invoice_appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON invoice_appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON invoice_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON invoice_sessions(company_id);

-- Update view for better performance with proper joins
DROP VIEW IF EXISTS view_uninvoiced_appointments;
CREATE VIEW view_uninvoiced_appointments AS
SELECT 
  ia.*,
  c.name as client_name,
  c.email as client_email
FROM invoice_appointments ia
JOIN clients c ON ia.client_id = c.id
WHERE ia.invoice_id IS NULL 
  AND ia.status = 'done';