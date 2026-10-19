-- Migration 0007: ML predictions table

create table public.ml_predictions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  model_version text not null,
  prediction_score numeric not null check (prediction_score >= 0 and prediction_score <= 1),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  features_used jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_ml_predictions_artist on public.ml_predictions(artist_id);
create index idx_ml_predictions_created on public.ml_predictions(created_at desc);

alter table public.ml_predictions enable row level security;

create policy "team reads predictions"
  on public.ml_predictions for select
  to authenticated
  using (public.is_team(auth.uid()));

revoke insert, update, delete on public.ml_predictions from anon, authenticated;
grant select on public.ml_predictions to authenticated;

create or replace function public.upsert_ml_prediction(
  p_artist_id uuid,
  p_model_version text,
  p_prediction_score numeric,
  p_confidence text,
  p_features_used jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  prediction_id uuid;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('admin', 'head_of_ar', 'analyst')
  ) then
    raise exception 'Analyst access is required.' using errcode = '42501';
  end if;
  insert into public.ml_predictions (artist_id, model_version, prediction_score, confidence, features_used)
  values (p_artist_id, p_model_version, p_prediction_score, p_confidence, p_features_used)
  returning id into prediction_id;
  return prediction_id;
end $$;

grant execute on function public.upsert_ml_prediction(uuid, text, numeric, text, jsonb) to authenticated;
revoke execute on function public.upsert_ml_prediction(uuid, text, numeric, text, jsonb) from public, anon;
