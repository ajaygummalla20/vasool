-- ==============================================================================
-- SETTLR MIGRATION: 20261009000000_fix_schema_and_security.sql
-- Description:
-- 1. Align schema columns with application usage (paid_at, payment fields, proposal fields).
-- 2. Restrict public invoice access by replacing open RLS with a token-validated RPC.
-- 3. Compatible with dependent views (invoices_due_for_reminder) by extending enum types directly.
-- ==============================================================================

-- 1. INVOICES TABLE ENHANCEMENTS
-- Add paid_at column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- If status is an ENUM (invoice_status), add missing values directly to the ENUM
-- (This preserves dependent views like invoices_due_for_reminder without 0A000 errors)
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partially_paid';

-- 2. PAYMENTS TABLE ENHANCEMENTS (Dual-column compatibility)
DO $$
BEGIN
  -- Add paid_at timestamp column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    -- Backfill from payment_date
    UPDATE public.payments SET paid_at = payment_date::TIMESTAMPTZ WHERE paid_at IS NULL;
  END IF;

  -- Add method column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'method'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN method TEXT NOT NULL DEFAULT 'upi';
    -- Backfill from payment_method
    UPDATE public.payments SET method = COALESCE(payment_method::TEXT, 'upi') WHERE method IS NULL;
  END IF;

  -- Add payment_method column if not present (for backward compat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'upi';
    -- Backfill from method
    UPDATE public.payments SET payment_method = COALESCE(method, 'upi') WHERE payment_method IS NULL;
  END IF;

  -- Add payment_date column if not present (for backward compat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payment_date DATE NOT NULL DEFAULT CURRENT_DATE;
    -- Backfill from paid_at
    UPDATE public.payments SET payment_date = (paid_at AT TIME ZONE 'UTC')::DATE WHERE payment_date IS NULL;
  END IF;
END $$;

-- Payment bidirectional synchronization trigger
CREATE OR REPLACE FUNCTION public.sync_payment_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync timestamp / date
  IF NEW.paid_at IS NULL AND NEW.payment_date IS NOT NULL THEN
    NEW.paid_at := NEW.payment_date::TIMESTAMPTZ;
  ELSIF NEW.paid_at IS NOT NULL AND (NEW.payment_date IS NULL OR NEW.payment_date = CURRENT_DATE) THEN
    NEW.payment_date := (NEW.paid_at AT TIME ZONE 'UTC')::DATE;
  END IF;

  -- Sync method / payment_method
  IF NEW.method IS NULL AND NEW.payment_method IS NOT NULL THEN
    NEW.method := NEW.payment_method::TEXT;
  ELSIF NEW.payment_method IS NULL AND NEW.method IS NOT NULL THEN
    BEGIN
      NEW.payment_method := NEW.method;
    EXCEPTION WHEN OTHERS THEN
      NEW.payment_method := 'other';
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_payment_fields ON public.payments;
CREATE TRIGGER trg_sync_payment_fields
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_fields();

-- 3. PROPOSALS TABLE ENHANCEMENTS
DO $$
BEGIN
  -- Add proposal_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'proposal_number'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN proposal_number TEXT;
  END IF;

  -- Add items JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'items'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN items JSONB;
  END IF;

  -- Add scope_of_work
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'scope_of_work'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN scope_of_work TEXT;
  END IF;

  -- Add terms
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'terms'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN terms TEXT;
  END IF;

  -- Add converted_invoice_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'converted_invoice_id'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN converted_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. FIX ROW LEVEL SECURITY (RLS) VULNERABILITY
-- Remove the open policies that allowed public enumeration of all invoices
DROP POLICY IF EXISTS "Public read invoice by token" ON public.invoices;
DROP POLICY IF EXISTS "Public read invoice items" ON public.invoice_items;

-- Ensure owner-isolated policies exist
DROP POLICY IF EXISTS "Users manage own invoices" ON public.invoices;
CREATE POLICY "Users manage own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage invoice items" ON public.invoice_items;
CREATE POLICY "Users manage invoice items" ON public.invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.user_id = auth.uid())
);

-- 5. SECURE RPC FOR TOKEN-VALIDATED INVOICE LOOKUPS
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

  -- Look up invoice strictly matching unique payment_token OR UUID id
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE payment_token = p_token OR id::TEXT = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch line items for this specific invoice
  SELECT COALESCE(jsonb_agg(to_jsonb(it) ORDER BY it.sort_order), '[]'::jsonb)
  INTO v_items
  FROM public.invoice_items it
  WHERE it.invoice_id = v_invoice.id;

  -- Fetch vendor profile for invoice header
  SELECT full_name, business_name, gst_number, address, city, state, phone,
         upi_id, bank_name, bank_account, bank_ifsc, msme_udyam_number
  INTO v_sender
  FROM public.profiles
  WHERE id = v_invoice.user_id;

  -- Fetch client information
  SELECT to_jsonb(cl)
  INTO v_client
  FROM public.clients cl
  WHERE cl.id = v_invoice.client_id;

  v_result := jsonb_build_object(
    'invoice', to_jsonb(v_invoice),
    'items', v_items,
    'sender', jsonb_build_object(
      'name', COALESCE(v_sender.business_name, v_sender.full_name, 'Business'),
      'gst', COALESCE(v_sender.gst_number, ''),
      'address', CONCAT_WS(', ', NULLIF(v_sender.address, ''), NULLIF(v_sender.city, ''), NULLIF(v_sender.state, '')),
      'phone', COALESCE(v_sender.phone, ''),
      'upiId', COALESCE(v_sender.upi_id, ''),
      'bankName', COALESCE(v_sender.bank_name, ''),
      'bankAccount', COALESCE(v_sender.bank_account, ''),
      'bankIfsc', COALESCE(v_sender.bank_ifsc, ''),
      'msmeUdyam', COALESCE(v_sender.msme_udyam_number, '')
    ),
    'client', v_client
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_invoice_by_token(TEXT) TO anon, authenticated, service_role;
