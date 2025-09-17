-- Fix RLS recursion issue in memberships table and session creation

-- First, let's create a direct session creation function that bypasses complex RLS
CREATE OR REPLACE FUNCTION create_session_direct(
  p_client_id UUID,
  p_started_at TIMESTAMPTZ DEFAULT NOW()
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_session_id UUID;
BEGIN
  -- Get company_id from client
  SELECT company_id INTO v_company_id
  FROM clients 
  WHERE id = p_client_id AND user_id = auth.uid();
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;
  
  -- Create session directly
  INSERT INTO invoice_sessions (
    company_id,
    client_id,
    started_at,
    status
  ) VALUES (
    v_company_id,
    p_client_id,
    p_started_at,
    'draft'
  ) RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_session_direct TO authenticated;