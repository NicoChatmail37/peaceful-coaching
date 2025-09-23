-- Fix infinite recursion in memberships RLS policies
-- Create a security definer function to check membership roles safely

CREATE OR REPLACE FUNCTION public.get_user_role_in_company(p_company_id uuid, p_user_id uuid)
RETURNS TEXT AS $$
  SELECT role FROM public.memberships 
  WHERE company_id = p_company_id AND user_id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Company owners can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;

-- Create new policies without recursion
CREATE POLICY "Users can view their own memberships" ON public.memberships
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert memberships they own" ON public.memberships
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company owners can update memberships" ON public.memberships
FOR UPDATE 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true  -- Users can update their own
    ELSE public.get_user_role_in_company(company_id, auth.uid()) = 'owner'
  END
);

CREATE POLICY "Company owners can delete memberships" ON public.memberships
FOR DELETE 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true  -- Users can delete their own
    ELSE public.get_user_role_in_company(company_id, auth.uid()) = 'owner'
  END
);