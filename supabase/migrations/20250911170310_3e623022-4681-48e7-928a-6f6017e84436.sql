-- 1) NOUVELLES TABLES

-- Sessions (séances/consultations)
CREATE TABLE IF NOT EXISTS invoice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title text,
  transcript_text text,
  notes_text text,
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','done','canceled')),
  invoice_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Appointments (agenda)
CREATE TABLE IF NOT EXISTS invoice_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','canceled','no_show')),
  session_id uuid NULL,
  invoice_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payments (encaissements)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('qr','cash','card')),
  amount numeric(12,2) NOT NULL,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- UI Presets (libellés métier)
CREATE TABLE IF NOT EXISTS company_ui_presets (
  company_id uuid PRIMARY KEY,
  labels_json jsonb NOT NULL DEFAULT '{"sessionLabel":"Séance","agendaLabel":"Agenda","notesLabel":"Notes","fieldLabels":{"transcript":"Transcript","todo":"À faire"}}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) INDEX DE PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_sessions_company_client ON invoice_sessions(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company_started ON invoice_sessions(company_id, started_at);
CREATE INDEX IF NOT EXISTS idx_appts_company_client ON invoice_appointments(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_appts_company_starts ON invoice_appointments(company_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_pay_company_invoice ON invoice_payments(company_id, invoice_id);

-- 3) FONCTION HELPER SÉCURISÉE (évite récursion RLS)

CREATE OR REPLACE FUNCTION is_member_company(c_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.company_id = c_id AND m.user_id = auth.uid()
  );
$$;

-- 4) ACTIVATION RLS

ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ui_presets ENABLE ROW LEVEL SECURITY;

-- 5) POLICIES RLS - SESSIONS

DROP POLICY IF EXISTS sess_sel ON invoice_sessions;
CREATE POLICY sess_sel ON invoice_sessions
FOR SELECT USING (is_member_company(company_id));

DROP POLICY IF EXISTS sess_ins ON invoice_sessions;
CREATE POLICY sess_ins ON invoice_sessions
FOR INSERT WITH CHECK (is_member_company(company_id));

DROP POLICY IF EXISTS sess_upd ON invoice_sessions;
CREATE POLICY sess_upd ON invoice_sessions
FOR UPDATE USING (is_member_company(company_id))
WITH CHECK (is_member_company(company_id));

DROP POLICY IF EXISTS sess_del ON invoice_sessions;
CREATE POLICY sess_del ON invoice_sessions
FOR DELETE USING (is_member_company(company_id));

-- 6) POLICIES RLS - APPOINTMENTS

DROP POLICY IF EXISTS appt_sel ON invoice_appointments;
CREATE POLICY appt_sel ON invoice_appointments
FOR SELECT USING (is_member_company(company_id));

DROP POLICY IF EXISTS appt_ins ON invoice_appointments;
CREATE POLICY appt_ins ON invoice_appointments
FOR INSERT WITH CHECK (is_member_company(company_id));

DROP POLICY IF EXISTS appt_upd ON invoice_appointments;
CREATE POLICY appt_upd ON invoice_appointments
FOR UPDATE USING (is_member_company(company_id))
WITH CHECK (is_member_company(company_id));

DROP POLICY IF EXISTS appt_del ON invoice_appointments;
CREATE POLICY appt_del ON invoice_appointments
FOR DELETE USING (is_member_company(company_id));

-- 7) POLICIES RLS - PAYMENTS

DROP POLICY IF EXISTS pay_sel ON invoice_payments;
CREATE POLICY pay_sel ON invoice_payments
FOR SELECT USING (is_member_company(company_id));

DROP POLICY IF EXISTS pay_ins ON invoice_payments;
CREATE POLICY pay_ins ON invoice_payments
FOR INSERT WITH CHECK (is_member_company(company_id));

-- 8) POLICIES RLS - UI PRESETS

DROP POLICY IF EXISTS preset_sel ON company_ui_presets;
CREATE POLICY preset_sel ON company_ui_presets
FOR SELECT USING (is_member_company(company_id));

DROP POLICY IF EXISTS preset_upsert ON company_ui_presets;
CREATE POLICY preset_upsert ON company_ui_presets
FOR ALL USING (is_member_company(company_id))
WITH CHECK (is_member_company(company_id));

-- 9) VUES MÉTIER

-- Timeline combinée (séances + factures)
CREATE OR REPLACE VIEW view_patient_timeline AS
SELECT
  s.company_id,
  s.client_id,
  s.id as session_id,
  s.started_at as ts,
  'session' as kind,
  s.title,
  s.status,
  s.invoice_id
FROM invoice_sessions s
UNION ALL
SELECT
  i.company_id,
  i.client_id,
  i.id as session_id,
  i.date::timestamptz as ts,
  'invoice' as kind,
  i.number as title,
  i.status,
  i.id as invoice_id
FROM invoices i;

-- RDV "à facturer"
CREATE OR REPLACE VIEW view_uninvoiced_appointments AS
SELECT *
FROM invoice_appointments a
WHERE a.status = 'done' AND a.invoice_id IS NULL;

-- Notes de la dernière séance
CREATE OR REPLACE VIEW view_notes_next_session AS
SELECT DISTINCT ON (company_id, client_id)
  company_id, 
  client_id, 
  notes_text, 
  ended_at
FROM invoice_sessions
WHERE status = 'done' AND notes_text IS NOT NULL AND notes_text <> ''
ORDER BY company_id, client_id, ended_at DESC;

-- 10) FONCTIONS RPC SÉCURISÉES

-- Créer une séance brouillon
CREATE OR REPLACE FUNCTION rpc_create_session(p_client_id uuid, p_started_at timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql 
SECURITY INVOKER 
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

-- Finaliser une séance
CREATE OR REPLACE FUNCTION rpc_finalize_session(p_session_id uuid, p_ended_at timestamptz DEFAULT now(), p_title text DEFAULT NULL)
RETURNS void
LANGUAGE sql 
SECURITY INVOKER 
AS $$
  UPDATE invoice_sessions
  SET ended_at = COALESCE(p_ended_at, now()),
      title = COALESCE(p_title, title),
      status = 'done',
      updated_at = now()
  WHERE id = p_session_id;
$$;

-- Créer une facture depuis une séance
CREATE OR REPLACE FUNCTION rpc_invoice_from_session(
  p_session_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_quantity numeric DEFAULT 1,
  p_unit_price numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql 
SECURITY INVOKER 
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

-- Enregistrer un paiement
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

-- 11) TRIGGERS POUR UPDATED_AT

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON invoice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON invoice_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON company_ui_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();