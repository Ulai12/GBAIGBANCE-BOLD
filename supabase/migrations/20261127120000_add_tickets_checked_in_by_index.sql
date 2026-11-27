-- Add covering index for tickets.checked_in_by foreign key
-- Eliminates unindexed_foreign_keys advisor warning.
-- Safe: nullable column, no data change, IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS tickets_checked_in_by_idx
  ON public.tickets (checked_in_by);

-- Rollback:
-- DROP INDEX IF EXISTS public.tickets_checked_in_by_idx;
