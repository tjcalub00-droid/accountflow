-- Migration: Alert Hub acknowledgements / dismissals
-- Tracks per-owner acknowledged or dismissed alerts (derived alerts are keyed by alert_key)

DROP TYPE IF EXISTS public.alert_action CASCADE;
CREATE TYPE public.alert_action AS ENUM ('acknowledged', 'dismissed');

CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  action public.alert_action NOT NULL DEFAULT 'acknowledged'::public.alert_action,
  acted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_alert_ack_owner_key UNIQUE (owner_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_alert_ack_owner_id ON public.alert_acknowledgements(owner_id);

CREATE OR REPLACE FUNCTION public.update_alert_ack_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_alert_acks" ON public.alert_acknowledgements;
CREATE POLICY "users_view_alert_acks"
ON public.alert_acknowledgements
FOR SELECT
TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "users_insert_alert_acks" ON public.alert_acknowledgements;
CREATE POLICY "users_insert_alert_acks"
ON public.alert_acknowledgements
FOR INSERT
TO authenticated
WITH CHECK (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "users_update_alert_acks" ON public.alert_acknowledgements;
CREATE POLICY "users_update_alert_acks"
ON public.alert_acknowledgements
FOR UPDATE
TO authenticated
USING (owner_id = public.get_effective_owner_id())
WITH CHECK (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "users_delete_alert_acks" ON public.alert_acknowledgements;
CREATE POLICY "users_delete_alert_acks"
ON public.alert_acknowledgements
FOR DELETE
TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP TRIGGER IF EXISTS alert_ack_updated_at ON public.alert_acknowledgements;
CREATE TRIGGER alert_ack_updated_at
  BEFORE UPDATE ON public.alert_acknowledgements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_ack_updated_at();
