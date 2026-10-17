-- Enable Supabase realtime for tables that feed the dashboard KPIs and Recent Activity
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['invoices', 'expenses', 'payroll_runs', 'vouchers', 'receipts', 'employees', 'invoice_logs'];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY tables LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = tbl
            ) AND NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            END IF;
        END LOOP;
    END IF;
END $$;
