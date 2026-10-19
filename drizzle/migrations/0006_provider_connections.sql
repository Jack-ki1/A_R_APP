-- Migration 0006: Per-user provider connections with Supabase Vault
-- Requires: Supabase Vault extension enabled (Dashboard → Database → Extensions → vault)

create extension if not exists vault with schema vault;

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'spotify', 'tiktok')),
  vault_secret_id uuid not null,
  key_hint text not null,
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create index idx_provider_connections_user on public.provider_connections(user_id);

alter table public.provider_connections enable row level security;

create policy "users read own connections"
  on public.provider_connections for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.provider_connections from anon, authenticated;
grant select on public.provider_connections to authenticated;

create or replace function public.connect_provider(
  p_provider text,
  p_api_key text
) returns uuid
language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare
  actor uuid := auth.uid();
  secret_id uuid;
  connection_id uuid;
  key_hint text;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_provider not in ('youtube', 'spotify', 'tiktok') then
    raise exception 'Unsupported provider.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_api_key, ''))) < 10 then
    raise exception 'API key must be at least 10 characters.' using errcode = '22023';
  end if;
  secret_id := vault.create_secret(
    trim(p_api_key),
    'provider_' || p_provider || '_' || actor::text,
    'API key for ' || p_provider || ' (user ' || actor::text || ')'
  );
  key_hint := '...' || right(trim(p_api_key), 4);
  insert into public.provider_connections (user_id, provider, vault_secret_id, key_hint, status, last_tested_at)
  values (actor, p_provider, secret_id, key_hint, 'connected', now())
  on conflict (user_id, provider) do update
    set vault_secret_id = excluded.vault_secret_id,
        key_hint = excluded.key_hint,
        status = 'connected',
        last_tested_at = now(),
        last_error = null,
        updated_at = now()
  returning id into connection_id;
  return connection_id;
end $$;

create or replace function public.get_provider_api_key(p_provider text)
returns text
language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare
  actor uuid := auth.uid();
  secret_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select vault_secret_id into secret_id
  from public.provider_connections
  where user_id = actor and provider = p_provider;
  if secret_id is null then
    raise exception 'No connection found for this provider.' using errcode = 'P0002';
  end if;
  return vault.decrypt_secret(secret_id);
end $$;

create or replace function public.disconnect_provider(p_provider text)
returns void
language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare
  actor uuid := auth.uid();
  secret_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select vault_secret_id into secret_id
  from public.provider_connections
  where user_id = actor and provider = p_provider
  for update;
  if secret_id is not null then
    delete from vault.secrets where id = secret_id;
  end if;
  delete from public.provider_connections
  where user_id = actor and provider = p_provider;
end $$;

create or replace function public.update_provider_connection_status(
  p_provider text,
  p_status text,
  p_error text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  update public.provider_connections
  set status = p_status,
      last_error = p_error,
      last_tested_at = now(),
      updated_at = now()
  where user_id = actor and provider = p_provider;
end $$;

grant execute on function public.connect_provider(text, text) to authenticated;
grant execute on function public.get_provider_api_key(text) to authenticated;
grant execute on function public.disconnect_provider(text) to authenticated;
grant execute on function public.update_provider_connection_status(text, text, text) to authenticated;
revoke execute on function public.connect_provider(text, text) from public, anon;
revoke execute on function public.get_provider_api_key(text) from public, anon;
revoke execute on function public.disconnect_provider(text) from public, anon;
revoke execute on function public.update_provider_connection_status(text, text, text) from public, anon;
