-- Add receipt_url column to expenses table
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for expense-receipts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'expense_receipts_select'
  ) THEN
    CREATE POLICY expense_receipts_select ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'expense-receipts'
        AND (storage.foldername(name))[1] = (
          SELECT COALESCE(up.owner_id::text, up.id::text)
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'expense_receipts_insert'
  ) THEN
    CREATE POLICY expense_receipts_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'expense-receipts'
        AND (storage.foldername(name))[1] = (
          SELECT COALESCE(up.owner_id::text, up.id::text)
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'expense_receipts_delete'
  ) THEN
    CREATE POLICY expense_receipts_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'expense-receipts'
        AND (storage.foldername(name))[1] = (
          SELECT COALESCE(up.owner_id::text, up.id::text)
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
        )
      );
  END IF;
END $$;
