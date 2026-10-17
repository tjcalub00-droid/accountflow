-- Profile onboarding: track first-login completion and capture business details

-- 1. Add onboarding columns to user_profiles.
-- Existing users are marked complete (DEFAULT true on add), so they skip onboarding.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '';

-- New accounts created after this migration start with onboarding pending.
ALTER TABLE public.user_profiles
ALTER COLUMN onboarding_completed SET DEFAULT false;

-- 2. Add extra business detail columns to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT '';

ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS business_address TEXT NOT NULL DEFAULT '';

ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS business_phone TEXT NOT NULL DEFAULT '';

-- 3. Update signup trigger so new sign-ups start with onboarding pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')::public.user_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
