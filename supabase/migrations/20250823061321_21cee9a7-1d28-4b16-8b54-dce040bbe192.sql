-- Create companies table for multi-enterprise management
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  npa TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  iban TEXT,
  tva_number TEXT,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#0070f3',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  npa TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products_services table
CREATE TABLE public.products_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pièce',
  category TEXT,
  is_service BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tva_rate DECIMAL(5,2) NOT NULL DEFAULT 7.7,
  tva_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_service_id UUID REFERENCES public.products_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounting_entries table
CREATE TABLE public.accounting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit DECIMAL(10,2) DEFAULT 0,
  credit DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for products_services
CREATE POLICY "Users can view their own products_services" ON public.products_services
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own products_services" ON public.products_services
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products_services" ON public.products_services
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products_services" ON public.products_services
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for invoices
CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for invoice_items
CREATE POLICY "Users can view invoice_items for their invoices" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can create invoice_items for their invoices" ON public.invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can update invoice_items for their invoices" ON public.invoice_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
CREATE POLICY "Users can delete invoice_items for their invoices" ON public.invoice_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );

-- Create RLS policies for accounting_entries
CREATE POLICY "Users can view their own accounting_entries" ON public.accounting_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounting_entries" ON public.accounting_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounting_entries" ON public.accounting_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounting_entries" ON public.accounting_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_services_updated_at
  BEFORE UPDATE ON public.products_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_company_id ON public.clients(company_id);
CREATE INDEX idx_products_services_user_id ON public.products_services(user_id);
CREATE INDEX idx_products_services_company_id ON public.products_services(company_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_accounting_entries_user_id ON public.accounting_entries(user_id);
CREATE INDEX idx_accounting_entries_company_id ON public.accounting_entries(company_id);
CREATE INDEX idx_accounting_entries_invoice_id ON public.accounting_entries(invoice_id);

-- Create function to automatically generate accounting entries when invoice is paid
CREATE OR REPLACE FUNCTION public.generate_accounting_entries()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate entries when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Insert debit entry for client receivable (411)
    INSERT INTO public.accounting_entries (
      user_id, company_id, invoice_id, account_code, account_name, 
      debit, credit, description, entry_date
    ) VALUES (
      NEW.user_id, NEW.company_id, NEW.id, '411', 'Clients',
      NEW.total, 0, 'Facture ' || NEW.number, NEW.date
    );
    
    -- Insert credit entry for sales (701)
    INSERT INTO public.accounting_entries (
      user_id, company_id, invoice_id, account_code, account_name,
      debit, credit, description, entry_date
    ) VALUES (
      NEW.user_id, NEW.company_id, NEW.id, '701', 'Ventes',
      0, NEW.subtotal, 'Facture ' || NEW.number, NEW.date
    );
    
    -- Insert credit entry for VAT (2201) if there's VAT
    IF NEW.tva_amount > 0 THEN
      INSERT INTO public.accounting_entries (
        user_id, company_id, invoice_id, account_code, account_name,
        debit, credit, description, entry_date
      ) VALUES (
        NEW.user_id, NEW.company_id, NEW.id, '2201', 'TVA due',
        0, NEW.tva_amount, 'TVA Facture ' || NEW.number, NEW.date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic accounting entries
CREATE TRIGGER generate_accounting_entries_trigger
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_accounting_entries();