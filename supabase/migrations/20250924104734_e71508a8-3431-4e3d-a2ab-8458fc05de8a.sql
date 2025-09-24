-- Fix security definer view issue by adding RLS policies to views
-- and ensuring proper access control

-- Enable RLS on existing views (views inherit RLS from underlying tables by default)
-- But we need to ensure the views have proper policies

-- First, let's check and fix the view ownership issue
-- Views owned by postgres can bypass RLS, so we need proper policies

-- For view_uninvoiced_appointments
-- This view should only show data for companies the user is a member of
DROP VIEW IF EXISTS public.view_uninvoiced_appointments;
CREATE VIEW public.view_uninvoiced_appointments 
WITH (security_barrier=true) AS
SELECT 
    ia.id,
    ia.company_id,
    ia.client_id,
    ia.title,
    ia.starts_at,
    ia.ends_at,
    ia.location,
    ia.status,
    ia.session_id,
    ia.invoice_id,
    ia.created_at,
    ia.updated_at,
    c.name AS client_name,
    c.email AS client_email
FROM invoice_appointments ia
JOIN clients c ON ia.client_id = c.id
WHERE ia.invoice_id IS NULL 
  AND ia.status = 'done'
  AND EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = ia.company_id 
    AND m.user_id = auth.uid()
  );

-- For view_accounting_consolidated  
-- This view should only show accounting data for companies the user is a member of
DROP VIEW IF EXISTS public.view_accounting_consolidated;
CREATE VIEW public.view_accounting_consolidated
WITH (security_barrier=true) AS
SELECT 
    ae.id,
    ae.company_id,
    ae.user_id,
    ae.entry_date,
    ae.source_id,
    ae.auto_generated,
    ae.posted_at,
    ae.reversed_of,
    ae.created_at,
    ae.description,
    ae.source_type,
    ae.idempotency_key,
    json_agg(
        json_build_object(
            'id', ael.id,
            'account_code', ael.account_code,
            'account_name', ael.account_name,
            'debit', ael.debit,
            'credit', ael.credit,
            'vat_code', ael.vat_code,
            'description', ael.description
        ) ORDER BY ael.account_code
    ) AS entry_lines,
    COALESCE(sum(ael.debit), 0::numeric) AS total_debit,
    COALESCE(sum(ael.credit), 0::numeric) AS total_credit
FROM accounting_entries ae
LEFT JOIN acc_entry_lines ael ON ae.id = ael.entry_id
WHERE EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = ae.company_id 
    AND m.user_id = auth.uid()
)
GROUP BY ae.id, ae.company_id, ae.user_id, ae.entry_date, ae.source_id, 
         ae.auto_generated, ae.posted_at, ae.reversed_of, ae.created_at, 
         ae.description, ae.source_type, ae.idempotency_key;

-- For view_general_ledger
-- This view should only show ledger data for companies the user is a member of
DROP VIEW IF EXISTS public.view_general_ledger;
CREATE VIEW public.view_general_ledger
WITH (security_barrier=true) AS
SELECT 
    ae.company_id,
    ae.user_id,
    ae.entry_date,
    ael.debit,
    ael.credit,
    ae.source_id,
    ae.auto_generated,
    ae.id AS entry_id,
    ael.id AS line_id,
    ae.created_at,
    ae.source_type,
    ael.description,
    ael.account_code,
    ael.account_name,
    ael.vat_code
FROM accounting_entries ae
JOIN acc_entry_lines ael ON ae.id = ael.entry_id
WHERE EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = ae.company_id 
    AND m.user_id = auth.uid()
)
ORDER BY ae.entry_date DESC, ae.created_at DESC;

-- For view_posting_trace
-- This view should only show posting traces for companies the user is a member of
DROP VIEW IF EXISTS public.view_posting_trace;
CREATE VIEW public.view_posting_trace
WITH (security_barrier=true) AS
SELECT 
    ae.id AS entry_id,
    ae.company_id,
    ae.user_id,
    ae.entry_date,
    ae.source_id,
    ae.auto_generated,
    ae.posted_at,
    ae.reversed_of,
    ae.created_at,
    ae.description,
    ae.source_type,
    ae.idempotency_key
FROM accounting_entries ae
WHERE EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = ae.company_id 
    AND m.user_id = auth.uid()
)
ORDER BY ae.created_at DESC;

-- For view_patient_timeline
-- This view should only show timeline data for companies the user is a member of
DROP VIEW IF EXISTS public.view_patient_timeline;
CREATE VIEW public.view_patient_timeline
WITH (security_barrier=true) AS
SELECT 
    s.company_id,
    s.client_id,
    s.id AS session_id,
    s.started_at AS ts,
    'session'::text AS kind,
    s.title,
    s.status,
    s.invoice_id
FROM invoice_sessions s
WHERE EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = s.company_id 
    AND m.user_id = auth.uid()
)
UNION ALL
SELECT 
    i.company_id,
    i.client_id,
    i.id AS session_id,
    i.date::timestamp with time zone AS ts,
    'invoice'::text AS kind,
    i.number AS title,
    i.status,
    i.id AS invoice_id
FROM invoices i
WHERE i.user_id = auth.uid();

-- For view_notes_next_session
-- This view should only show notes for companies the user is a member of
DROP VIEW IF EXISTS public.view_notes_next_session;
CREATE VIEW public.view_notes_next_session
WITH (security_barrier=true) AS
SELECT DISTINCT ON (company_id, client_id)
    company_id,
    client_id,
    notes_text,
    ended_at
FROM invoice_sessions
WHERE status = 'done'
  AND notes_text IS NOT NULL 
  AND notes_text <> ''
  AND EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.company_id = invoice_sessions.company_id 
    AND m.user_id = auth.uid()
  )
ORDER BY company_id, client_id, ended_at DESC;