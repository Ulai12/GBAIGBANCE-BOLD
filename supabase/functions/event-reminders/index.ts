import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Server configuration unavailable' }, 500);

  // Endpoint appelé par pg_cron : le secret est conservé dans Supabase Vault,
  // jamais dans le dépôt ni dans les paramètres publics du frontend.
  const cronSecret = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret) return json({ error: 'Unauthorized' }, 401);

  const { data: authorized, error: authError } = await supabase.rpc(
    'verify_event_reminders_cron_secret',
    { p_secret: cronSecret },
  );
  if (authError || authorized !== true) return json({ error: 'Unauthorized' }, 401);

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const window24 = 30 * 60 * 1000;
    const window2 = 15 * 60 * 1000;

    const [result24, result2] = await Promise.all([
      supabase.from('events')
        .select('id, title, starts_at')
        .eq('status', 'published')
        .gte('starts_at', new Date(in24h.getTime() - window24).toISOString())
        .lte('starts_at', new Date(in24h.getTime() + window24).toISOString()),
      supabase.from('events')
        .select('id, title, starts_at')
        .eq('status', 'published')
        .gte('starts_at', new Date(in2h.getTime() - window2).toISOString())
        .lte('starts_at', new Date(in2h.getTime() + window2).toISOString()),
    ]);
    if (result24.error || result2.error) throw result24.error || result2.error;

    let sent = 0;
    const batches = [
      ...(result24.data || []).map((event) => ({ event, type: 'reminder_24h', label: '24h' })),
      ...(result2.data || []).map((event) => ({ event, type: 'reminder_2h', label: '2h' })),
    ];

    for (const { event, type, label } of batches) {
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('user_id')
        .eq('event_id', event.id)
        .in('status', ['valid', 'active']);
      if (ticketsError) throw ticketsError;

      const userIds = [...new Set((tickets || []).map((ticket) => ticket.user_id).filter(Boolean))];
      for (const userId of userIds) {
        const { data: prefs, error: prefsError } = await supabase
          .from('notification_preferences')
          .select('event_reminders')
          .eq('user_id', userId)
          .maybeSingle();
        if (prefsError) throw prefsError;
        if (prefs?.event_reminders === false) continue;

        const { count, error: countError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', type)
          .eq('entity_id', event.id);
        if (countError) throw countError;
        if ((count || 0) > 0) continue;

        const { error: insertError } = await supabase.from('notifications').insert({
          user_id: userId,
          type,
          entity_type: 'event',
          entity_id: event.id,
          title: `Rappel : ${event.title} dans ${label}`,
          body: `N'oublie pas : ${event.title} commence bientôt.`,
          is_read: false,
        });
        if (insertError) throw insertError;
        sent++;
      }
    }

    return json({ ok: true, sent });
  } catch (error) {
    console.error('[event-reminders] failed', error);
    return json({ error: 'Unable to process event reminders' }, 500);
  }
});
