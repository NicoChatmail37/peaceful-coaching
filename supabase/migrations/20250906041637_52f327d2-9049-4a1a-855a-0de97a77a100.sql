-- Add exported field to invoices table
ALTER TABLE public.invoices 
ADD COLUMN exported boolean DEFAULT false;