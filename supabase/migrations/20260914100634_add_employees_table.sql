-- Migration: Add employees table for Employee Management
-- Timestamp: 20260914100634

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  sss_rate NUMERIC NOT NULL DEFAULT 0,
  pagibig_rate NUMERIC NOT NULL DEFAULT 0,
  hdmf_rate NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_owner_id ON public.employees(owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "users_manage_own_employees" ON public.employees;
CREATE POLICY "users_manage_own_employees"
ON public.employees
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_employees_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_employees_updated_at();

-- Mock data: seed sample employees for existing owner
DO $$
DECLARE
  existing_owner_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    SELECT id INTO existing_owner_id
    FROM public.user_profiles
    WHERE role = 'owner'
    LIMIT 1;

    IF existing_owner_id IS NULL THEN
      SELECT id INTO existing_owner_id FROM public.user_profiles LIMIT 1;
    END IF;

    IF existing_owner_id IS NOT NULL THEN
      INSERT INTO public.employees (id, owner_id, full_name, role, monthly_salary, sss_rate, pagibig_rate, hdmf_rate, is_active)
      VALUES
        (gen_random_uuid(), existing_owner_id, 'Danielle Marsh', 'Operations Manager', 18000, 1125, 100, 200, true),
        (gen_random_uuid(), existing_owner_id, 'Kwame Asante', 'Senior Consultant', 20800, 1125, 100, 200, true),
        (gen_random_uuid(), existing_owner_id, 'Sofia Reyes', 'Marketing Lead', 15200, 1125, 100, 200, true),
        (gen_random_uuid(), existing_owner_id, 'Tyler Nguyen', 'Junior Analyst', 8000, 800, 100, 100, true)
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE NOTICE 'No existing users found. Skipping employee mock data.';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_profiles does not exist. Skipping employee mock data.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Employee mock data insertion failed: %', SQLERRM;
END $$;
