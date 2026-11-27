-- Enable the existing Postgres Changes subscriptions used by FavoritesContext
-- and NotificationBell. RLS remains enabled on every table.

ALTER PUBLICATION supabase_realtime
  ADD TABLE
    public.notifications,
    public.event_likes,
    public.artist_follows,
    public.organization_follows,
    public.user_follows;
