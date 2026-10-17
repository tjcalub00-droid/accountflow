-- Allow expenses to be marked as paid
ALTER TYPE public.expense_status ADD VALUE IF NOT EXISTS 'paid';
