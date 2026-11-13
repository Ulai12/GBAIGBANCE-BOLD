-- Rebuild GBAIGBANCE platform analytics from trusted database records.
-- Demo rows are explicitly marked; new production rows remain non-demo by default.

alter table public.events add column if not exists is_demo boolean not null default false;
alter table public.artists add column if not exists is_demo boolean not null default false;
alter table public.organizations add column if not exists is_demo boolean not null default false;

update public.events set is_demo = true
where id in (
  'e1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000006',
  'e1000000-0000-0000-0000-000000000007',
  'e1000000-0000-0000-0000-000000000008'
);

update public.artists set is_demo = true
where id in (
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000006'
);

update public.organizations set is_demo = true
where id in (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003'
);

create table if not exists public.event_view_daily (
  event_id uuid not null references public.events(id) on delete cascade,
  visitor_key uuid not null,
  viewed_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (event_id, visitor_key, viewed_on)
);

create index if not exists event_view_daily_viewed_on_idx
  on public.event_view_daily (viewed_on desc);

alter table public.event_view_daily enable row level security;
revoke all on table public.event_view_daily from anon, authenticated;

create or replace function public.record_event_view(p_event_id uuid, p_visitor_key uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event boolean := false;
  current_views bigint := 0;
begin
  if p_event_id is null or p_visitor_key is null then
    raise exception 'event_id and visitor_key are required';
  end if;

  insert into public.event_view_daily (event_id, visitor_key, viewed_on)
  select e.id, p_visitor_key, (now() at time zone 'utc')::date
  from public.events e
  where e.id = p_event_id
    and e.is_demo = false
    and e.status = 'published'
  on conflict do nothing
  returning true into inserted_event;

  if coalesce(inserted_event, false) then
    update public.events
    set views_count = greatest(coalesce(views_count, 0), 0) + 1,
        updated_at = now()
    where id = p_event_id and is_demo = false;
  end if;

  select greatest(coalesce(e.views_count, 0), 0)::bigint
  into current_views
  from public.events e
  where e.id = p_event_id and e.is_demo = false;

  return coalesce(current_views, 0);
end;
$$;

revoke all on function public.record_event_view(uuid, uuid) from public;
grant execute on function public.record_event_view(uuid, uuid) to anon, authenticated;

create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_utc timestamptz := now();
  result jsonb;
begin
  with real_events as (
    select e.*
    from public.events e
    where coalesce(e.is_demo, false) = false
  ),
  active_events as (
    select e.*
    from real_events e
    where e.status = 'published'
      and (e.ends_at is null or e.ends_at >= now_utc)
  ),
  valid_tickets as (
    select t.*
    from public.tickets t
    join real_events e on e.id = t.event_id
    where lower(coalesce(t.status, '')) in ('active', 'valid', 'used')
  ),
  ticket_counts as (
    select t.event_id, count(*)::bigint as participants
    from valid_tickets t
    group by t.event_id
  ),
  category_counts as (
    select e.category, count(*)::bigint as event_count
    from active_events e
    group by e.category
  )
  select jsonb_build_object(
    'isAvailable', true,
    'totalEvents', (select count(*) from active_events),
    'totalAllEvents', (select count(*) from real_events),
    'totalArtists', (select count(*) from public.artists a where coalesce(a.is_demo, false) = false),
    'totalOrganizers', (select count(*) from public.organizations o where coalesce(o.is_demo, false) = false),
    'totalTickets', (select count(*) from valid_tickets),
    'totalParticipants', (select count(*) from valid_tickets),
    'totalParticipantAccounts', (select count(distinct user_id) from valid_tickets where user_id is not null),
    'totalProfiles', (select count(*) from public.profiles),
    'totalPendingPlatformInvitations', (
      select count(*) from auth.users u where u.invited_at is not null and u.confirmed_at is null
    ),
    'totalUsers', (
      select count(*) from auth.users u where not (u.invited_at is not null and u.confirmed_at is null)
    ),
    'totalViews', (select coalesce(sum(greatest(e.views_count, 0)), 0) from real_events e),
    -- Payment confirmation is not implemented in the current schema. Do not call reservations revenue.
    'totalRevenue', 0,
    'totalCancelledTickets', (
      select count(*) from public.tickets t join real_events e on e.id = t.event_id where lower(t.status) = 'cancelled'
    ),
    'totalRefundedTickets', (
      select count(*) from public.tickets t join real_events e on e.id = t.event_id where lower(t.status) = 'refunded'
    ),
    'categories', coalesce((
      select jsonb_object_agg(category, event_count) from category_counts
    ), '{}'::jsonb),
    'categoryBasis', 'events',
    'categoryShares', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', category,
        'count', event_count,
        'amount', 0,
        'percent', case when (select count(*) from active_events) > 0
          then round((event_count::numeric / (select count(*) from active_events)) * 100)::int
          else 0 end
      ) order by event_count desc)
      from category_counts
    ), '[]'::jsonb),
    'ticketsTimeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'created_at', t.created_at,
        'created_at_ms', (extract(epoch from t.created_at) * 1000)::bigint,
        'price_paid', 0,
        'event_id', t.event_id
      ) order by t.created_at asc)
      from (
        select vt.id, vt.created_at, vt.event_id
        from valid_tickets vt
        order by vt.created_at asc
        limit 5000
      ) t
    ), '[]'::jsonb),
    'eventsTimeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'starts_at_ms', (extract(epoch from e.starts_at) * 1000)::bigint,
        'attendees', coalesce(tc.participants, 0)
      ) order by e.starts_at asc)
      from real_events e
      left join ticket_counts tc on tc.event_id = e.id
      where e.status in ('published', 'completed')
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated;
