/*
# Fix attendees display: RLS-safe function + resync attendees_count

## Problem
1. The `tickets` table has RLS `tickets_select_own` (auth.uid() = user_id), so a user
   viewing an event can only see their OWN tickets — `fetchEventAttendees` returns empty
   for everyone else. This is why no participant avatars show.
2. The `attendees_count` on events is stale for some events (e.g., "Gratuit test" shows
   101 but only has 2 active tickets; "CALL OF DUTY" shows 10 but has 5 active tickets).
   The trigger `sync_attendees_count` counts `status <> 'cancelled'` which is correct,
   but the count was manually set to wrong values during seed/testing.

## Changes
1. Create `get_event_attendees(p_event_id uuid)` — SECURITY DEFINER function that bypasses
   RLS to read all active tickets for an event, joins with profiles, and returns
   `{ user_id, name, avatar_url, ticket_count }` for up to 20 distinct buyers.
   This is safe: it only exposes public profile info (name, avatar) of people who
   bought tickets for a public event — same as seeing who's attending a concert.
2. Resync `attendees_count` for ALL events to match the actual count of non-cancelled
   tickets, so the displayed participant number is correct.

## Security
- The SECURITY DEFINER function runs with owner privileges but only exposes
  `user_id`, `name`, and `avatar_url` — no sensitive ticket data (no price, no QR code).
- EXECUTE granted to `authenticated` role so the frontend can call it via RPC.
- No changes to existing RLS policies on `tickets`.
*/

-- 1. Create SECURITY DEFINER function to fetch event attendees (bypasses tickets RLS)
CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  ticket_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.user_id,
    p.name,
    p.avatar_url,
    COUNT(*)::bigint AS ticket_count
  FROM tickets t
  LEFT JOIN profiles p ON p.id = t.user_id
  WHERE t.event_id = p_event_id
    AND t.status <> 'cancelled'
  GROUP BY t.user_id, p.name, p.avatar_url
  ORDER BY ticket_count DESC
  LIMIT 20;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated;

-- 2. Resync attendees_count for all events
UPDATE events e
SET attendees_count = (
  SELECT COUNT(*) FROM tickets t
  WHERE t.event_id = e.id AND t.status <> 'cancelled'
);
