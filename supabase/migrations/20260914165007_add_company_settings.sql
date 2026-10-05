-- Company Settings table for business owner configuration
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL DEFAULT '',
    tax_id TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD',
    pay_cycle TEXT NOT NULL DEFAULT 'bimonthly',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (owner_id)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_owner_id ON public.company_settings(owner_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_company_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_settings_updated_at ON public.company_settings;
CREATE TRIGGER company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_company_settings_updated_at();

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_own_company_settings" ON public.company_settings;
CREATE POLICY "owners_manage_own_company_settings"
ON public.company_settings
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
