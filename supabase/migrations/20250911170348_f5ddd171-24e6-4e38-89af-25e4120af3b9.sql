-- Correction des alertes de sécurité : ajout de search_path pour toutes les nouvelles fonctions

-- Corriger rpc_create_session
CREATE OR REPLACE FUNCTION rpc_create_session(p_client_id uuid, p_started_at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_id uuid;
BEGIN
  -- Récupère la company du contexte (première company active du user)
  SELECT c.id INTO v_company
  FROM companies c
  JOIN memberships m ON c.id = m.company_id
  WHERE m.user_id = auth.uid() AND c.is_active = true
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'No active company found for user';
  END IF;

  INSERT INTO invoice_sessions(company_id, client_id, started_at, status)
  VALUES (v_company, p_client_id, COALESCE(p_started_at, now()), 'draft')
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- Corriger rpc_finalize_session
CREATE OR REPLACE FUNCTION rpc_finalize_session(p_session_id uuid, p_ended_at timestamptz DEFAULT now(), p_title text DEFAULT NULL)
RETURNS void
LANGUAGE sql 
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE invoice_sessions
  SET ended_at = COALESCE(p_ended_at, now()),
      title = COALESCE(p_title, title),
      status = 'done',
      updated_at = now()
  WHERE id = p_session_id;
$$;

-- Corriger rpc_invoice_from_session
CREATE OR REPLACE FUNCTION rpc_invoice_from_session(
  p_session_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_quantity numeric DEFAULT 1,
  p_unit_price numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_s record;
  v_invoice_id uuid;
  v_label text;
  v_date date;
  v_number text;
BEGIN
  SELECT * INTO v_s FROM invoice_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_label := COALESCE(v_s.title, 'Séance');
  v_date := COALESCE(v_s.ended_at, v_s.started_at, now())::date;
  
  -- Générer un numéro de facture simple (à améliorer avec numbering_settings)
  SELECT 'F' || LPAD(COALESCE(MAX(CAST(SUBSTRING(number FROM 2) AS INTEGER)), 0) + 1, 6, '0')
  INTO v_number
  FROM invoices 
  WHERE company_id = v_s.company_id;

  -- 1) Créer facture brouillon
  INSERT INTO invoices(
    company_id, 
    client_id, 
    date, 
    due_date, 
    number, 
    status,
    user_id
  )
  VALUES (
    v_s.company_id, 
    v_s.client_id, 
    v_date,
    v_date + INTERVAL '30 days',
    v_number,
    'draft',
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- 2) Ligne de facture
  INSERT INTO invoice_items(
    invoice_id, 
    product_service_id, 
    description, 
    quantity, 
    unit_price,
    total
  )
  VALUES (
    v_invoice_id,
    p_product_id,
    FORMAT('%s du %s', v_label, TO_CHAR(v_date,'DD.MM.YYYY')),
    COALESCE(p_quantity, 1),
    p_unit_price,
    COALESCE(p_quantity, 1) * COALESCE(p_unit_price, 0)
  );

  -- 3) Lier la séance
  UPDATE invoice_sessions SET invoice_id = v_invoice_id WHERE id = p_session_id;

  -- 4) Émettre l'événement outbox
  INSERT INTO domain_outbox(
    company_id,
    user_id,
    source_id,
    source_type,
    event_type,
    payload
  )
  VALUES (
    v_s.company_id,
    auth.uid(),
    v_invoice_id,
    'invoice',
    'invoice.created',
    jsonb_build_object('invoice_id', v_invoice_id)
  );

  RETURN v_invoice_id;
END $$;

-- Corriger rpc_record_payment
CREATE OR REPLACE FUNCTION rpc_record_payment(
  p_invoice_id uuid,
  p_method text,
  p_amount numeric,
  p_fee_amount numeric DEFAULT 0,
  p_paid_at timestamptz DEFAULT now(),
  p_reference text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_id uuid;
  v_key text;
BEGIN
  SELECT company_id INTO v_company FROM invoices WHERE id = p_invoice_id;
  
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  INSERT INTO invoice_payments(
    company_id, 
    invoice_id, 
    method, 
    amount, 
    fee_amount, 
    paid_at, 
    reference
  )
  VALUES (
    v_company, 
    p_invoice_id, 
    p_method, 
    p_amount, 
    COALESCE(p_fee_amount, 0), 
    COALESCE(p_paid_at, now()), 
    p_reference
  )
  RETURNING id INTO v_id;

  -- Clé idempotente pour éviter doublons
  v_key := FORMAT('invoice:paid:%s:%s:%s', 
    p_invoice_id, 
    p_method, 
    TO_CHAR(COALESCE(p_paid_at, now()), 'YYYYMMDDHH24MISS')
  );

  INSERT INTO domain_outbox(
    company_id,
    user_id,
    source_id,
    source_type,
    event_type,
    payload
  )
  VALUES (
    v_company,
    auth.uid(),
    p_invoice_id,
    'payment',
    FORMAT('invoice.paid.%s', p_method),
    jsonb_build_object('invoice_id', p_invoice_id, 'payment_id', v_id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN v_id;
END $$;

-- Corriger la fonction trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;