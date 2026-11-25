-- 20261125123618_protect_event_reminders_cron_endpoint.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'event-reminders-cron') THEN
    PERFORM vault.create_secret(
      gen_random_uuid()::text,
      'event-reminders-cron',
      'Private token used only by the hourly event-reminders cron job'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_event_reminders_cron_secret(p_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1 FROM vault.decrypted_secrets s
    WHERE s.name = 'event-reminders-cron' AND s.decrypted_secret = p_secret
  ), false);
$$;
REVOKE ALL ON FUNCTION public.verify_event_reminders_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_event_reminders_cron_secret(text) TO service_role;

SELECT cron.alter_job(1, command := $cmd$
SELECT net.http_post(
  url := 'https://lwwiolbofrqakvrdvbbj.supabase.co/functions/v1/event-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (
      SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name = 'event-reminders-cron' LIMIT 1
    )
  ),
  body := '{}'::jsonb
) AS request_id;
$cmd$);
