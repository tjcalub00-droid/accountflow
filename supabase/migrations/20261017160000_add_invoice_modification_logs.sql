-- Migration: Invoice modification logs
-- One log entry per saved edit of an invoice (timestamp + what changed)

CREATE TABLE IF NOT EXISTS public.invoice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  modified_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  modified_by_name TEXT NOT NULL DEFAULT ''::text,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_logs_invoice_id ON public.invoice_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_logs_owner_id ON public.invoice_logs(owner_id);

ALTER TABLE public.invoice_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_invoice_logs" ON public.invoice_logs;
CREATE POLICY "users_view_invoice_logs"
ON public.invoice_logs
FOR SELECT
TO authenticated
USING (owner_id = public.get_effective_owner_id());

DROP POLICY IF EXISTS "users_insert_invoice_logs" ON public.invoice_logs;
CREATE POLICY "users_insert_invoice_logs"
ON public.invoice_logs
FOR INSERT
TO authenticated
WITH CHECK (owner_id = public.get_effective_owner_id());
