-- access_type / external_ticket_url / whatsapp sur events
-- Applique 2026-11-17 projet lwwiolbofrqakvrdvbbj
-- Colonnes natives (plus seulement meta dans description)

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'tickets',
  ADD COLUMN IF NOT EXISTS external_ticket_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_message text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS unlimited_capacity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS sales_end_at timestamptz;
