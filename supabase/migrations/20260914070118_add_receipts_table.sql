-- Receipt Storage table for AccountFlow
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'receipts' AND policyname = 'receipts_owner_all'
  ) THEN
    CREATE POLICY receipts_owner_all ON public.receipts
      FOR ALL
      USING (
        owner_id = (
          SELECT COALESCE(up.owner_id, up.id)
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
        )
      )
      WITH CHECK (
        owner_id = (
          SELECT COALESCE(up.owner_id, up.id)
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
        )
      );
  END IF;
END $$;
