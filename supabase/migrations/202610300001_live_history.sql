-- Apply using the Supabase SQL editor or CLI. Browser/anon keys have no access.
create table if not exists public.live_flight_state (
  id text primary key, updated_at bigint not null, expires_at bigint not null, payload jsonb not null
);
create index if not exists live_state_expiry on public.live_flight_state(expires_at);
create table if not exists public.live_flight_events (
  id text not null, updated_at bigint not null, received_at timestamptz not null default now(), payload jsonb not null,
  primary key (id, updated_at)
);
create table if not exists public.live_flight_sync (scope text primary key, payload jsonb not null);
alter table public.live_flight_state enable row level security;
alter table public.live_flight_events enable row level security;
alter table public.live_flight_sync enable row level security;
revoke all on public.live_flight_state, public.live_flight_events, public.live_flight_sync from anon, authenticated;
grant all on public.live_flight_state, public.live_flight_events, public.live_flight_sync to service_role;

create or replace function public.record_live_flights(records jsonb) returns void language plpgsql as $$
begin
  -- Record service/phase transitions before replacing the latest position.
  insert into public.live_flight_events(id, updated_at, payload)
    select item->>'id', (item->>'updatedAt')::bigint, item
    from jsonb_array_elements(records) item
    left join public.live_flight_state previous on previous.id = item->>'id'
    where previous.id is null or ((item->>'updatedAt')::bigint >= previous.updated_at and
      jsonb_build_array(item->'callsign',item->'flightNumber',item->'from',item->'to',item->'source',item->'onGround',coalesce(item->'terminal','false'::jsonb),item->'serviceDate')
        is distinct from jsonb_build_array(previous.payload->'callsign',previous.payload->'flightNumber',previous.payload->'from',previous.payload->'to',previous.payload->'source',previous.payload->'onGround',coalesce(previous.payload->'terminal','false'::jsonb),previous.payload->'serviceDate'))
    on conflict do nothing;
  insert into public.live_flight_state(id, updated_at, expires_at, payload)
    select item->>'id', (item->>'updatedAt')::bigint, (item->>'expiresAt')::bigint, item
    from jsonb_array_elements(records) item
    on conflict(id) do update set updated_at=excluded.updated_at, expires_at=excluded.expires_at, payload=excluded.payload
      where excluded.updated_at >= live_flight_state.updated_at;
  delete from public.live_flight_state where expires_at < extract(epoch from now() - interval '48 hours') * 1000;
  delete from public.live_flight_events where received_at < now() - interval '7 days';
end $$;
create or replace function public.set_live_sync(sync_scope text, sync_payload jsonb) returns void language sql as $$
  insert into public.live_flight_sync(scope,payload) values(sync_scope,sync_payload)
    on conflict(scope) do update set payload=excluded.payload
    where (excluded.payload->>'checkedAt')::bigint >= (live_flight_sync.payload->>'checkedAt')::bigint;
$$;
revoke all on function public.record_live_flights(jsonb), public.set_live_sync(text,jsonb) from public, anon, authenticated;
grant execute on function public.record_live_flights(jsonb), public.set_live_sync(text,jsonb) to service_role;
