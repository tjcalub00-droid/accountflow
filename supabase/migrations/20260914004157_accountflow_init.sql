-- AccountFlow: Full schema migration
-- Tables: user_profiles, invoices, expenses, payroll_runs, vouchers, transactions

-- ============================================================
-- 1. TYPES
-- ============================================================
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('owner', 'accountant', 'viewer');

DROP TYPE IF EXISTS public.invoice_status CASCADE;
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'void');

DROP TYPE IF EXISTS public.expense_status CASCADE;
CREATE TYPE public.expense_status AS ENUM ('pending', 'approved', 'rejected');

DROP TYPE IF EXISTS public.payroll_status CASCADE;
CREATE TYPE public.payroll_status AS ENUM ('scheduled', 'processing', 'paid', 'pending');

DROP TYPE IF EXISTS public.voucher_status CASCADE;
CREATE TYPE public.voucher_status AS ENUM ('draft', 'approved', 'posted', 'void');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'viewer'::public.user_role,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer TEXT NOT NULL,
  customer_email TEXT NOT NULL DEFAULT '',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft'::public.invoice_status,
  days_overdue INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT '',
  has_receipt BOOLEAN NOT NULL DEFAULT false,
  tax_deductible BOOLEAN NOT NULL DEFAULT false,
  status public.expense_status NOT NULL DEFAULT 'pending'::public.expense_status,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  pay_period TEXT NOT NULL,
  pay_date DATE NOT NULL,
  employee_name TEXT NOT NULL,
  employee_role TEXT NOT NULL DEFAULT '',
  gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  federal_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  state_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  fica NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_ins NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.payroll_status NOT NULL DEFAULT 'pending'::public.payroll_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  voucher_number TEXT NOT NULL,
  voucher_type TEXT NOT NULL DEFAULT 'payment',
  party_name TEXT NOT NULL,
  voucher_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  status public.voucher_status NOT NULL DEFAULT 'draft'::public.voucher_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_owner_id ON public.user_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_owner_id ON public.payroll_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_owner_id ON public.vouchers(owner_id);

-- ============================================================
-- 4. FUNCTIONS (before RLS policies)
-- ============================================================

-- Auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Helper: get the effective owner_id for the current user
CREATE OR REPLACE FUNCTION public.get_effective_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.user_profiles WHERE id = auth.uid() AND owner_id IS NOT NULL LIMIT 1),
    auth.uid()
  );
$$;

-- Helper: check if current user has a given role
CREATE OR REPLACE FUNCTION public.has_role(required_role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- user_profiles: users manage their own profile; owners can see sub-users
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "owners_view_subusers" ON public.user_profiles;
CREATE POLICY "owners_view_subusers"
ON public.user_profiles FOR SELECT TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owners_manage_subusers" ON public.user_profiles;
CREATE POLICY "owners_manage_subusers"
ON public.user_profiles FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- invoices: owner and sub-users of same owner can access
DROP POLICY IF EXISTS "users_access_invoices" ON public.invoices;
CREATE POLICY "users_access_invoices"
ON public.invoices FOR SELECT TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "owners_manage_invoices" ON public.invoices;
CREATE POLICY "owners_manage_invoices"
ON public.invoices FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "accountants_manage_invoices" ON public.invoices;
CREATE POLICY "accountants_manage_invoices"
ON public.invoices FOR ALL TO authenticated
USING (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
)
WITH CHECK (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
);

-- expenses
DROP POLICY IF EXISTS "users_access_expenses" ON public.expenses;
CREATE POLICY "users_access_expenses"
ON public.expenses FOR SELECT TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "owners_manage_expenses" ON public.expenses;
CREATE POLICY "owners_manage_expenses"
ON public.expenses FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "accountants_manage_expenses" ON public.expenses;
CREATE POLICY "accountants_manage_expenses"
ON public.expenses FOR ALL TO authenticated
USING (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
)
WITH CHECK (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
);

-- payroll_runs: only owner can manage
DROP POLICY IF EXISTS "users_view_payroll" ON public.payroll_runs;
CREATE POLICY "users_view_payroll"
ON public.payroll_runs FOR SELECT TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "owners_manage_payroll" ON public.payroll_runs;
CREATE POLICY "owners_manage_payroll"
ON public.payroll_runs FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- vouchers
DROP POLICY IF EXISTS "users_view_vouchers" ON public.vouchers;
CREATE POLICY "users_view_vouchers"
ON public.vouchers FOR SELECT TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "owners_manage_vouchers" ON public.vouchers;
CREATE POLICY "owners_manage_vouchers"
ON public.vouchers FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "accountants_manage_vouchers" ON public.vouchers;
CREATE POLICY "accountants_manage_vouchers"
ON public.vouchers FOR ALL TO authenticated
USING (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
)
WITH CHECK (
  owner_id = public.get_effective_owner_id()
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  )
);

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. MOCK DATA
-- ============================================================
DO $$
DECLARE
  owner_uuid UUID := gen_random_uuid();
  acct_uuid UUID := gen_random_uuid();
BEGIN
  -- Create owner auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    owner_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'owner@accountflow.demo', crypt('demo1234', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Marcus Reynolds', 'role', 'owner'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Create accountant auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    acct_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'accountant@accountflow.demo', crypt('demo1234', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Sarah Chen', 'role', 'accountant'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Link accountant to owner
  UPDATE public.user_profiles SET owner_id = owner_uuid WHERE id = acct_uuid;

  -- Invoices
  INSERT INTO public.invoices (user_id, owner_id, invoice_number, customer, customer_email, issue_date, due_date, amount, tax, total, status, days_overdue)
  VALUES
    (owner_uuid, owner_uuid, 'INV-0051', 'NovaStar Solutions', 'billing@novastar.io', '2026-09-10', '2026-10-10', 11200, 1200, 12400, 'sent'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0050', 'Horizon Media Group', 'accounts@horizonmedia.com', '2026-08-25', '2026-09-09', 3818, 382, 4200, 'overdue'::public.invoice_status, 5),
    (owner_uuid, owner_uuid, 'INV-0049', 'Apex Retail Co.', 'finance@apexretail.com', '2026-08-18', '2026-09-02', 1682, 168, 1850, 'overdue'::public.invoice_status, 12),
    (owner_uuid, owner_uuid, 'INV-0048', 'Stellar Labs Inc.', 'ap@stellarlabs.com', '2026-08-10', '2026-08-27', 2818, 282, 3100, 'overdue'::public.invoice_status, 18),
    (owner_uuid, owner_uuid, 'INV-0047', 'Brightworks Agency', 'invoices@brightworks.co', '2026-08-30', '2026-09-14', 6182, 618, 6800, 'paid'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0046', 'Cascade Partners', 'billing@cascade.io', '2026-08-22', '2026-09-06', 4545, 455, 5000, 'partial'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0045', 'Meridian Consulting', 'ar@meridianconsult.com', '2026-08-15', '2026-08-30', 8182, 818, 9000, 'paid'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0044', 'Blueridge Digital', 'finance@blueridgedigital.com', '2026-08-05', '2026-08-20', 3636, 364, 4000, 'paid'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0043', 'Pinnacle Events', 'billing@pinnacleevents.com', '2026-07-28', '2026-08-12', 5455, 545, 6000, 'paid'::public.invoice_status, null),
    (owner_uuid, owner_uuid, 'INV-0040', 'Luminary Health', 'billing@luminaryhealth.org', '2026-09-12', '2026-10-12', 4091, 409, 4500, 'draft'::public.invoice_status, null)
  ON CONFLICT (id) DO NOTHING;

  -- Expenses
  INSERT INTO public.expenses (user_id, owner_id, expense_date, vendor, category, amount, payment_method, has_receipt, tax_deductible, status, notes)
  VALUES
    (owner_uuid, owner_uuid, '2026-09-13', 'Adobe Inc.', 'Software & Tools', 599, 'Business Card', true, true, 'approved'::public.expense_status, 'Annual Creative Cloud license'),
    (owner_uuid, owner_uuid, '2026-09-12', 'James Okafor (Contractor)', 'Contractors', 3200, 'Bank Transfer', true, true, 'approved'::public.expense_status, 'Frontend dev sprint 22'),
    (owner_uuid, owner_uuid, '2026-09-11', 'WeWork', 'Office & Admin', 780, 'Business Card', true, true, 'approved'::public.expense_status, 'Hot desk Sep 2026'),
    (owner_uuid, owner_uuid, '2026-09-10', 'Meta Ads', 'Marketing', 1400, 'Business Card', false, true, 'pending'::public.expense_status, 'Q3 campaign budget'),
    (owner_uuid, owner_uuid, '2026-09-09', 'Delta Airlines', 'Travel', 620, 'Personal Card', true, true, 'approved'::public.expense_status, 'NYC client meeting'),
    (owner_uuid, owner_uuid, '2026-09-08', 'Notion Inc.', 'Software & Tools', 96, 'Business Card', true, true, 'approved'::public.expense_status, 'Team plan annual'),
    (owner_uuid, owner_uuid, '2026-09-07', 'Priya Sharma (Contractor)', 'Contractors', 2800, 'Bank Transfer', true, true, 'approved'::public.expense_status, 'Copywriting landing pages'),
    (owner_uuid, owner_uuid, '2026-09-06', 'Comcast Business', 'Utilities', 189, 'Auto-pay', true, true, 'approved'::public.expense_status, 'Business internet Sep'),
    (owner_uuid, owner_uuid, '2026-09-05', 'Logitech', 'Equipment', 340, 'Business Card', false, true, 'pending'::public.expense_status, 'MX Keys keyboard and mouse'),
    (owner_uuid, owner_uuid, '2026-09-04', 'Deloitte Advisory', 'Professional Services', 2400, 'Bank Transfer', true, true, 'approved'::public.expense_status, 'Q3 tax planning session')
  ON CONFLICT (id) DO NOTHING;

  -- Payroll runs
  INSERT INTO public.payroll_runs (owner_id, pay_period, pay_date, employee_name, employee_role, gross_pay, federal_tax, state_tax, fica, health_ins, net_pay, status)
  VALUES
    (owner_uuid, 'Sep 1-15, 2026', '2026-09-15', 'Danielle Marsh', 'Operations Manager', 4500, 810, 270, 344, 220, 2856, 'processing'::public.payroll_status),
    (owner_uuid, 'Sep 1-15, 2026', '2026-09-15', 'Kwame Asante', 'Senior Consultant', 5200, 1040, 364, 398, 220, 3178, 'processing'::public.payroll_status),
    (owner_uuid, 'Sep 1-15, 2026', '2026-09-15', 'Sofia Reyes', 'Marketing Lead', 3800, 608, 228, 291, 180, 2493, 'processing'::public.payroll_status),
    (owner_uuid, 'Sep 1-15, 2026', '2026-09-15', 'Tyler Nguyen', 'Junior Analyst (PT)', 2000, 240, 100, 153, 0, 1507, 'scheduled'::public.payroll_status),
    (owner_uuid, 'Aug 16-31, 2026', '2026-08-31', 'Danielle Marsh', 'Operations Manager', 4500, 810, 270, 344, 220, 2856, 'paid'::public.payroll_status),
    (owner_uuid, 'Aug 16-31, 2026', '2026-08-31', 'Kwame Asante', 'Senior Consultant', 5200, 1040, 364, 398, 220, 3178, 'paid'::public.payroll_status),
    (owner_uuid, 'Aug 16-31, 2026', '2026-08-31', 'Sofia Reyes', 'Marketing Lead', 3800, 608, 228, 291, 180, 2493, 'paid'::public.payroll_status),
    (owner_uuid, 'Aug 16-31, 2026', '2026-08-31', 'Tyler Nguyen', 'Junior Analyst (PT)', 2000, 240, 100, 153, 0, 1507, 'paid'::public.payroll_status)
  ON CONFLICT (id) DO NOTHING;

  -- Vouchers
  INSERT INTO public.vouchers (owner_id, voucher_number, voucher_type, party_name, voucher_date, amount, description, status)
  VALUES
    (owner_uuid, 'VCH-0021', 'payment', 'Priya Sharma', '2026-09-13', 2800, 'Copywriting services payment', 'approved'::public.voucher_status),
    (owner_uuid, 'VCH-0020', 'receipt', 'NovaStar Solutions', '2026-09-10', 12400, 'Advance receipt for INV-0051', 'posted'::public.voucher_status),
    (owner_uuid, 'VCH-0019', 'payment', 'WeWork', '2026-09-11', 780, 'Office space Sep 2026', 'approved'::public.voucher_status),
    (owner_uuid, 'VCH-0018', 'journal', 'Internal', '2026-09-01', 0, 'Month-end accrual entry', 'draft'::public.voucher_status)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
