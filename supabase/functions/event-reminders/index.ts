import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const window24 = 30 * 60 * 1000;
  const window2 = 15 * 60 * 1000;

  const { data: events24 } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('status', 'published')
    .gte('starts_at', new Date(in24h.getTime() - window24).toISOString())
    .lte('starts_at', new Date(in24h.getTime() + window24).toISOString());

  const { data: events2 } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('status', 'published')
    .gte('starts_at', new Date(in2h.getTime() - window2).toISOString())
    .lte('starts_at', new Date(in2h.getTime() + window2).toISOString());

  let sent = 0;

  for (const ev of [...(events24 || []), ...(events2 || [])]) {
    const is24 = (events24 || []).some((e) => e.id === ev.id);
    const type = is24 ? 'reminder_24h' : 'reminder_2h';
    const title = is24 ? `Rappel : ${ev.title} dans 24h` : `Rappel : ${ev.title} dans 2h`;

    const { data: tickets } = await supabase
      .from('tickets')
      .select('user_id')
      .eq('event_id', ev.id)
      .eq('status', 'active');

    const userIds = [...new Set((tickets || []).map((t) => t.user_id))];

    for (const userId of userIds) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('event_reminders')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefs?.event_reminders === false) continue;

      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('entity_id', ev.id);

      if ((count || 0) > 0) continue;

      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        entity_type: 'event',
        entity_id: ev.id,
        title,
        body: `N'oublie pas : ${ev.title} commence bientôt.`,
        is_read: false,
      });
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
