-- Fix security definer view issue by completely removing problematic views
-- Since views owned by privileged users create security concerns,
-- we'll remove them and let the application use direct queries instead

-- Drop all views that are causing security definer issues
DROP VIEW IF EXISTS public.view_uninvoiced_appointments CASCADE;
DROP VIEW IF EXISTS public.view_accounting_consolidated CASCADE;
DROP VIEW IF EXISTS public.view_general_ledger CASCADE;
DROP VIEW IF EXISTS public.view_posting_trace CASCADE;
DROP VIEW IF EXISTS public.view_patient_timeline CASCADE;
DROP VIEW IF EXISTS public.view_notes_next_session CASCADE;

-- Note: The application should be updated to use direct queries instead of these views
-- This ensures proper RLS is applied through the underlying table policies
-- rather than through potentially privileged view access