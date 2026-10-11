-- ==============================================================================
-- SETTLR: Phase 2 Security, Billing & Schema Consistency Migration
-- Resolves repository audit findings:
-- 1. subscriptions & billing_orders schema persistence & RLS
-- 2. clients.is_archived column addition
-- 3. recurring_templates title, template_name, next_due, next_run_date, tax_rate, payment_terms, notes
-- 4. generate_invoice_number race condition lock (FOR UPDATE) & auth.uid() check
-- 5. get_public_invoice_by_token strictly enforcing payment_token lookup (no IDOR)
-- 6. Cross-tenant payment verification trigger
-- 7. Unique constraint on (user_id, invoice_number) with deduplication guard
-- ==============================================================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL DEFAULT 'starter' CHECK (plan_id IN ('starter', 'pro', 'agency')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscriptions;
CREATE POLICY "Users can manage own subscription"
  ON public.subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- 2. Billing Orders Table (Pending orders tracking & idempotency)
CREATE TABLE IF NOT EXISTS public.billing_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('pro', 'agency')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing orders" ON public.billing_orders;
CREATE POLICY "Users can view own billing orders"
  ON public.billing_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own billing orders" ON public.billing_orders;
CREATE POLICY "Users can create own billing orders"
  ON public.billing_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Clients is_archived column & Invoices payment_token safeguard
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_token TEXT;
ALTER TABLE public.invoices ALTER COLUMN payment_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
UPDATE public.invoices SET payment_token = encode(gen_random_bytes(16), 'hex') WHERE payment_token IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_token ON public.invoices(payment_token);

-- 4. Recurring Templates Table & Schema Alignment (Fail-Safe)
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_name TEXT,
  title TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  amount NUMERIC NOT NULL DEFAULT 0,
  next_run_date DATE DEFAULT CURRENT_DATE,
  next_due DATE DEFAULT CURRENT_DATE,
  tax_rate NUMERIC DEFAULT 18,
  payment_terms TEXT DEFAULT 'Net 15',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  items JSONB,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all column variants exist on recurring_templates before backfilling
DO $$
BEGIN
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS template_name TEXT;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS next_run_date DATE;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS next_due DATE;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 18;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 15';
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS items JSONB;
  ALTER TABLE public.recurring_templates ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;

  -- Dynamic SQL backfill ensures column names are resolved after columns exist in catalog
  EXECUTE 'UPDATE public.recurring_templates 
           SET title = COALESCE(title, template_name, ''Retainer Schedule''),
               template_name = COALESCE(template_name, title, ''Retainer Schedule''),
               next_due = COALESCE(next_due, next_run_date, CURRENT_DATE),
               next_run_date = COALESCE(next_run_date, next_due, CURRENT_DATE)';
END $$;

-- Enable RLS and isolate recurring templates per user
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring templates" ON public.recurring_templates;
CREATE POLICY "Users manage own recurring templates"
  ON public.recurring_templates FOR ALL
  USING (auth.uid() = user_id);

-- 5. Deduplicate and Create Unique Index on (user_id, invoice_number)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_invoices_user_number') THEN
    -- Disambiguate any existing duplicate invoice numbers to avoid failure
    WITH dupes AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, invoice_number ORDER BY created_at) AS rnum
      FROM public.invoices
    )
    UPDATE public.invoices inv
    SET invoice_number = inv.invoice_number || '-DUP' || dup.rnum
    FROM dupes dup
    WHERE inv.id = dup.id AND dup.rnum > 1;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number ON public.invoices(user_id, invoice_number);
  END IF;
END $$;

-- 6. Concurrency-Safe Sequential Invoice Number Generator
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invoice_counter INTEGER DEFAULT 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
  v_invoice_number TEXT;
  v_target_user UUID;
BEGIN
  -- Security check: derive from authenticated session, preventing cross-user sequence tampering
  v_target_user := COALESCE(auth.uid(), p_user_id);
  IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND auth.uid() <> p_user_id THEN
    v_target_user := auth.uid();
  END IF;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User ID is required to generate invoice number';
  END IF;

  SELECT COALESCE(invoice_prefix, 'INV'), COALESCE(invoice_counter, 1)
  INTO v_prefix, v_counter
  FROM public.profiles
  WHERE id = v_target_user
  FOR UPDATE; -- Explicit row-level lock to prevent sequence race conditions

  IF NOT FOUND THEN
    v_prefix := 'INV';
    v_counter := 1;
  END IF;

  v_invoice_number := v_prefix || '-' || LPAD(v_counter::TEXT, 4, '0');

  UPDATE public.profiles
  SET invoice_counter = v_counter + 1,
      updated_at = NOW()
  WHERE id = v_target_user;

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Public Invoice Lookup: Enforce secret payment_token strictly (Prevent IDOR via sequential/UUID IDs)
CREATE OR REPLACE FUNCTION public.get_public_invoice_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_items JSONB;
  v_sender RECORD;
  v_client JSONB;
  v_result JSONB;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  -- Look up invoice strictly matching unique payment_token
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE payment_token = trim(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch line items for this specific invoice
  SELECT COALESCE(jsonb_agg(to_jsonb(it) ORDER BY it.sort_order), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT id, description, quantity, unit, unit_price, sort_order
    FROM public.invoice_items
    WHERE invoice_id = v_invoice.id
  ) it;

  -- Fetch sender business profile (safe public fields only)
  SELECT
    COALESCE(business_name, full_name, 'Business') AS name,
    COALESCE(gst_number, '') AS gst,
    TRIM(CONCAT_WS(', ', NULLIF(address, ''), NULLIF(city, ''), NULLIF(state, ''))) AS address,
    COALESCE(phone, '') AS phone,
    COALESCE(upi_id, '') AS "upiId",
    COALESCE(bank_name, '') AS "bankName",
    COALESCE(bank_account, '') AS "bankAccount",
    COALESCE(bank_ifsc, '') AS "bankIfsc",
    COALESCE(msme_udyam_number, '') AS "msmeUdyam"
  INTO v_sender
  FROM public.profiles
  WHERE id = v_invoice.user_id;

  -- Fetch client details if attached
  IF v_invoice.client_id IS NOT NULL THEN
    SELECT to_jsonb(c) INTO v_client
    FROM (
      SELECT name, company_name, email, gst_number, city, state, address
      FROM public.clients
      WHERE id = v_invoice.client_id
    ) c;
  ELSE
    v_client := NULL;
  END IF;

  v_result := jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'status', v_invoice.status,
      'total_amount', v_invoice.total_amount,
      'amount_due', v_invoice.amount_due,
      'discount_amount', v_invoice.discount_amount,
      'cgst_pct', v_invoice.cgst_pct,
      'sgst_pct', v_invoice.sgst_pct,
      'igst_pct', v_invoice.igst_pct,
      'issue_date', v_invoice.issue_date,
      'due_date', v_invoice.due_date,
      'paid_at', v_invoice.paid_at,
      'payment_terms', v_invoice.payment_terms,
      'late_fee_terms', v_invoice.late_fee_terms,
      'notes', v_invoice.notes
    ),
    'items', v_items,
    'sender', to_jsonb(v_sender),
    'client', v_client
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_invoice_by_token(TEXT) TO anon, authenticated, service_role;

-- 8. Cross-Tenant Integrity Protection Trigger
CREATE OR REPLACE FUNCTION public.check_cross_tenant_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_user UUID;
BEGIN
  SELECT user_id INTO v_invoice_user
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_invoice_user IS NULL OR v_invoice_user <> NEW.user_id THEN
    RAISE EXCEPTION 'Cross-tenant violation: Invoice % does not belong to payment user %', NEW.invoice_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_payment_tenant ON public.payments;
CREATE TRIGGER trg_check_payment_tenant
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.check_cross_tenant_payment();

-- 9. Subscriptions Security Lockdown (Fix SEC-01 Privilege Escalation)
-- Normal users can only SELECT their own subscription. Direct INSERT/UPDATE from client is blocked.
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.billing_orders TO service_role;
