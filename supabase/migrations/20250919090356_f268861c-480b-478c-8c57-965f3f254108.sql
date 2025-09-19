-- Fix RLS policies for employees table to use proper membership-based access control
-- and implement role-based restrictions for sensitive employee data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view employees of their companies" ON public.employees;
DROP POLICY IF EXISTS "Users can create employees for their companies" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees of their companies" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees of their companies" ON public.employees;

-- Create new secure policies using membership-based access

-- VIEW: All company members can view basic employee info, but sensitive data requires HR/owner role
CREATE POLICY "Members can view employees of their companies" ON public.employees
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = employees.company_id 
    AND m.user_id = auth.uid()
  )
);

-- INSERT: Only owners and HR can add employees
CREATE POLICY "Owners and HR can create employees" ON public.employees
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = employees.company_id 
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'hr')
  )
);

-- UPDATE: Only owners and HR can modify employees
CREATE POLICY "Owners and HR can update employees" ON public.employees
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = employees.company_id 
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'hr')
  )
);

-- DELETE: Only owners can delete employees
CREATE POLICY "Only owners can delete employees" ON public.employees
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = employees.company_id 
    AND m.user_id = auth.uid()
    AND m.role = 'owner'
  )
);

-- Fix payruns table policies for sensitive payroll data
DROP POLICY IF EXISTS "Users can view payruns of their companies" ON public.payruns;
DROP POLICY IF EXISTS "Users can create payruns for their companies" ON public.payruns;
DROP POLICY IF EXISTS "Users can update payruns of their companies" ON public.payruns;
DROP POLICY IF EXISTS "Users can delete payruns of their companies" ON public.payruns;

-- Only owners and HR should access payroll data
CREATE POLICY "Owners and HR can view payruns" ON public.payruns
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = payruns.company_id 
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'hr', 'fiduciary')
  )
);

CREATE POLICY "Owners and HR can create payruns" ON public.payruns
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = payruns.company_id 
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'hr', 'fiduciary')
  )
);

CREATE POLICY "Owners and HR can update payruns" ON public.payruns
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = payruns.company_id 
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'hr', 'fiduciary')
  )
);

CREATE POLICY "Only owners can delete payruns" ON public.payruns
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = payruns.company_id 
    AND m.user_id = auth.uid()
    AND m.role = 'owner'
  )
);

-- Fix time_entries policies to use membership-based access
DROP POLICY IF EXISTS "Users can view their company time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their company time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their company time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their company time entries" ON public.time_entries;

-- All company members can manage time entries
CREATE POLICY "Members can view company time entries" ON public.time_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = time_entries.company_id 
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create company time entries" ON public.time_entries
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = time_entries.company_id 
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update company time entries" ON public.time_entries
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = time_entries.company_id 
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete company time entries" ON public.time_entries
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = time_entries.company_id 
    AND m.user_id = auth.uid()
  )
);

-- Also update clients table to use membership-based access
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Members can view company clients" ON public.clients
FOR SELECT USING (
  CASE 
    WHEN company_id IS NULL THEN auth.uid() = user_id
    ELSE EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = clients.company_id 
      AND m.user_id = auth.uid()
    )
  END
);

CREATE POLICY "Members can create company clients" ON public.clients
FOR INSERT WITH CHECK (
  CASE 
    WHEN company_id IS NULL THEN auth.uid() = user_id
    ELSE EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = clients.company_id 
      AND m.user_id = auth.uid()
    )
  END
);

CREATE POLICY "Members can update company clients" ON public.clients
FOR UPDATE USING (
  CASE 
    WHEN company_id IS NULL THEN auth.uid() = user_id
    ELSE EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = clients.company_id 
      AND m.user_id = auth.uid()
    )
  END
);

CREATE POLICY "Members can delete company clients" ON public.clients
FOR DELETE USING (
  CASE 
    WHEN company_id IS NULL THEN auth.uid() = user_id
    ELSE EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = clients.company_id 
      AND m.user_id = auth.uid()
    )
  END
);