-- ==============================================================================
-- SETTLR: MSME Financial Operating System - Complete Database Schema
-- Compatible with Supabase PostgreSQL (Standard & Cloud Free Tier)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (User Profile, Business KYC, Banking & MSME Settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  business_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  gst_number TEXT,
  pan_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Andhra Pradesh',
  pincode TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  upi_id TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  msme_udyam_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. CLIENTS TABLE (Directory of B2B/B2C Customers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  gst_number TEXT,
  pan TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Andhra Pradesh',
  pincode TEXT,
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CONTRACTS TABLE (AI Legal Contract Analysis & MSMED Act Protections)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_url TEXT,
  extracted_amount NUMERIC,
  extracted_due_date DATE,
  extracted_payment_terms TEXT,
  extracted_late_fee TEXT,
  extracted_scope TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. INVOICES TABLE (Tax Invoices, Proformas, Credit Notes & Payment Status)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_terms TEXT DEFAULT 'Due on receipt',
  late_fee_terms TEXT,
  notes TEXT,
  client_notes TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_pct NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_pct NUMERIC DEFAULT 0,
  sgst_pct NUMERIC DEFAULT 0,
  igst_pct NUMERIC DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  reminders_enabled BOOLEAN DEFAULT TRUE,
  payment_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  razorpay_order_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. INVOICE ITEMS TABLE (Line items, quantities, rates & HSN/SAC codes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'hrs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. PAYMENTS TABLE (Reconciled Transactions, UPI, Cash & Razorpay)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'upi',
  payment_method TEXT NOT NULL DEFAULT 'upi',
  reference_number TEXT,
  razorpay_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. REMINDERS TABLE (Automated WhatsApp & Email Schedule Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'skipped', 'failed')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  days_overdue INTEGER DEFAULT 0,
  used_contract_context BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. EXPENSES TABLE (MSME Business Expenses, Vendor Invoices & ITC Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vendor_name TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'upi',
  gst_amount NUMERIC DEFAULT 0,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. PROPOSALS TABLE (Quotations, B2B Scopes & Deliverables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  proposal_number TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  valid_until DATE,
  items JSONB,
  scope_of_work TEXT,
  terms TEXT,
  scope_summary TEXT,
  deliverables JSONB,
  payment_schedule JSONB,
  notes TEXT,
  converted_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. RECURRING TEMPLATES TABLE (Automated Monthly/Quarterly Retainers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  title TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  amount NUMERIC NOT NULL DEFAULT 0,
  next_run_date DATE NOT NULL,
  next_due DATE,
  tax_rate NUMERIC DEFAULT 18,
  payment_terms TEXT DEFAULT 'Net 15',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  items JSONB,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. SUBSCRIPTIONS TABLE (SaaS Plan Tiers & Razorpay Verification)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 12. BILLING ORDERS TABLE (Pending Order Reconciliation & Idempotency)
-- ------------------------------------------------------------------------------
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

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_token ON public.invoices(payment_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number ON public.invoices(user_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_order_id ON public.billing_orders(order_id);

-- ==============================================================================
-- STORED PROCEDURES & RPC FUNCTIONS
-- ==============================================================================

-- 1. Sequential Invoice Number Generator (Atomic, Concurrency-Safe with Row Locking)
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
  FOR UPDATE; -- Row-level lock to prevent concurrency race conditions

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

-- 2. Auto-Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, invoice_prefix, invoice_counter)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'business_name', split_part(NEW.email, '@', 1) || ' Enterprise'),
    'INV',
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Automatic Bidirectional Sync for Payment Fields (method <-> payment_method, paid_at <-> payment_date)
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
    NEW.method := NEW.payment_method;
  ELSIF NEW.payment_method IS NULL AND NEW.method IS NOT NULL THEN
    NEW.payment_method := NEW.method;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_payment_fields ON public.payments;
CREATE TRIGGER trg_sync_payment_fields
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_fields();

-- 4. Cross-Tenant Integrity Protection Trigger
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

-- 5. Secure Public Invoice Lookup by Exact Token (Prevents IDOR via sequential/UUID IDs)
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - 100% TENANT ISOLATION
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients: Owner isolation
CREATE POLICY "Users manage own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);

-- Contracts: Owner isolation
CREATE POLICY "Users manage own contracts" ON public.contracts FOR ALL USING (auth.uid() = user_id);

-- Invoices: Strictly owner-isolated. Public reads MUST validate token via get_public_invoice_by_token() RPC
CREATE POLICY "Users manage own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- Invoice Items: Strictly owner-isolated via parent invoice
CREATE POLICY "Users manage invoice items" ON public.invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE public.invoices.id = public.invoice_items.invoice_id AND public.invoices.user_id = auth.uid())
);

-- Payments: Owner isolation
CREATE POLICY "Users manage own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Reminders: Owner isolation
CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);

-- Expenses: Owner isolation
CREATE POLICY "Users manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);

-- Proposals: Owner isolation
CREATE POLICY "Users manage own proposals" ON public.proposals FOR ALL USING (auth.uid() = user_id);

-- Recurring Templates: Owner isolation
CREATE POLICY "Users manage own recurring templates" ON public.recurring_templates FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: Owner read-only isolation (Writes strictly restricted to backend service_role)
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Billing Orders: Owner isolation
CREATE POLICY "Users can view own billing orders" ON public.billing_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own billing orders" ON public.billing_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

