-- Migration 0006: Per-user provider connections
-- Encryption is performed in the Node.js server functions (AES-256-GCM) before the
-- value reaches this table, so no Postgres extension (vault/pgcrypto) is required.
-- The encrypted_key column stores "iv:authTag:ciphertext" (base64) and is never
-- readable by the client — RPCs return it only to the owning user's server function.

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'spotify', 'tiktok')),
  encrypted_key text not null,
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
revoke select on public.provider_connections from anon;
grant select on public.provider_connections to authenticated;

create or replace function public.connect_provider(
  p_provider text,
  p_encrypted_key text,
  p_key_hint text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  connection_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_provider not in ('youtube', 'spotify', 'tiktok') then
    raise exception 'Unsupported provider.' using errcode = '22023';
  end if;
  if length(coalesce(p_encrypted_key, '')) < 20 then
    raise exception 'Encrypted credential is missing or malformed.' using errcode = '22023';
  end if;
  if length(coalesce(p_key_hint, '')) < 4 then
    raise exception 'Credential hint is missing.' using errcode = '22023';
  end if;
  insert into public.provider_connections (user_id, provider, encrypted_key, key_hint, status, last_tested_at)
  values (actor, p_provider, p_encrypted_key, p_key_hint, 'connected', now())
  on conflict (user_id, provider) do update
    set encrypted_key = excluded.encrypted_key,
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
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  encrypted text;
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select encrypted_key into encrypted
  from public.provider_connections
  where user_id = actor and provider = p_provider;
  if encrypted is null then
    raise exception 'No connection found for this provider.' using errcode = 'P0002';
  end if;
  return encrypted;
end $$;

create or replace function public.disconnect_provider(p_provider text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication required.' using errcode = '42501';
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

grant execute on function public.connect_provider(text, text, text) to authenticated;
grant execute on function public.get_provider_api_key(text) to authenticated;
grant execute on function public.disconnect_provider(text) to authenticated;
grant execute on function public.update_provider_connection_status(text, text, text) to authenticated;
revoke execute on function public.connect_provider(text, text, text) from public, anon;
revoke execute on function public.get_provider_api_key(text) from public, anon;
revoke execute on function public.disconnect_provider(text) from public, anon;
revoke execute on function public.update_provider_connection_status(text, text, text) from public, anon;
