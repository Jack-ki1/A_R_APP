-- Atomic, actor-attributed A&R workflow actions. Apply to staging after 0004.
alter table public.artistic_reviews
  add column reviewer_user_id uuid references auth.users(id),
  add column rubric_version text not null default 'ar-rubric-v1',
  add column evidence_json jsonb not null default '[]';

alter table public.integrity_cases
  add column opened_by uuid references auth.users(id),
  add column evidence_json jsonb not null default '[]';

create table public.integrity_decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.integrity_cases(id),
  artist_id uuid not null references public.artists(id),
  decided_by uuid not null references auth.users(id),
  outcome public.integrity_class not null,
  reason text not null check (length(trim(reason)) >= 3),
  evidence_ids jsonb not null default '[]',
  decided_at timestamptz not null default now()
);

create table public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  entity text not null,
  from_state text,
  to_state text not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  rationale text not null check (length(trim(rationale)) >= 3),
  evidence_refs jsonb not null default '[]'
);

alter table public.integrity_decisions enable row level security;
alter table public.workflow_history enable row level security;
grant select on public.integrity_decisions, public.workflow_history to authenticated;
revoke insert, update, delete on public.integrity_decisions, public.workflow_history from anon, authenticated;
create policy "team reads integrity decisions" on public.integrity_decisions for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads workflow history" on public.workflow_history for select to authenticated using (public.is_team(auth.uid()));

-- Public sign-up must never grant the first visitor an admin role. Admin bootstrap
-- is an explicit operator action; only Auth invitations receive the scout role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
    on conflict (id) do nothing;
  if new.invited_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'scout') on conflict do nothing;
  end if;
  return new;
end $$;

-- Writes to review and case outcome are exposed only through actor-derived RPCs.
revoke insert, update, delete on public.artistic_reviews, public.integrity_cases from anon, authenticated;
grant select on public.artistic_reviews, public.integrity_cases to authenticated;

create or replace function public.audit_artist_stage() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare stage_reason text;
begin
  new.updated_at = now();
  if new.pipeline_stage is distinct from old.pipeline_stage then
    stage_reason := current_setting('app.stage_rationale', true);
    if coalesce(length(trim(stage_reason)),0) < 3 then
      raise exception 'Use the guarded pipeline action and provide a rationale.' using errcode = '22023';
    end if;
    if new.pipeline_stage = 'signed' and not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'head_of_ar')) then
      raise exception 'Only Head of A&R or Admin can mark an artist signed.' using errcode = '42501';
    end if;
    insert into public.audit_log(actor_id, entity, entity_id, action, detail)
      values (auth.uid(), 'artist', new.id, 'stage_change', jsonb_build_object(
        'from',old.pipeline_stage,'to',new.pipeline_stage,'artist',new.name,'rationale',stage_reason));
  end if;
  return new;
end $$;

create or replace function public.save_artistic_review(
  p_artist_id uuid, p_scores jsonb, p_verdict text, p_notes text, p_evidence jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  review_uuid uuid;
  score_key text;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('scout','analyst','head_of_ar','admin')
  ) then raise exception 'Authorized reviewer access is required.' using errcode = '42501'; end if;
  if jsonb_typeof(p_scores) is distinct from 'object' or jsonb_typeof(p_evidence) is distinct from 'array'
    or p_verdict not in ('Strong yes','Promising','Not yet','Pass')
    or length(trim(coalesce(p_notes,''))) < 3 then
    raise exception 'A valid rubric, verdict, notes, and evidence list are required.' using errcode = '22023';
  end if;
  for score_key in select jsonb_object_keys(p_scores) loop
    if jsonb_typeof(p_scores->score_key) <> 'number'
      or (p_scores->>score_key)::numeric < 1 or (p_scores->>score_key)::numeric > 5 then
      raise exception 'Rubric scores must be numbers from 1 to 5.' using errcode = '22023';
    end if;
  end loop;
  if (select count(*) from jsonb_object_keys(p_scores)) <> 6 or exists (
    select 1 from jsonb_object_keys(p_scores) score_key
    where score_key not in ('Vocal / performance','Songwriting','Originality','Live presence','Visual identity','Work ethic signals')
  ) then
    raise exception 'All six versioned rubric dimensions are required.' using errcode = '22023';
  end if;
  insert into public.artistic_reviews (artist_id, reviewer, reviewer_user_id, scores, verdict, notes, rubric_version, evidence_json)
    values (p_artist_id, coalesce((select display_name from public.profiles where id = actor), 'Reviewer'), actor,
      p_scores, p_verdict, trim(p_notes), 'ar-rubric-v1', p_evidence)
    returning id into review_uuid;
  update public.artists set artistic_status = 'Reviewed: ' || p_verdict where id = p_artist_id and is_demo = false;
  if not found then raise exception 'Operational artist not found.' using errcode = '22023'; end if;
  insert into public.audit_log(actor_id, entity, entity_id, action, detail)
    values (actor, 'artistic_review', review_uuid, 'review_saved', jsonb_build_object('artist_id',p_artist_id,'verdict',p_verdict,'rubric_version','ar-rubric-v1'));
  return review_uuid;
end $$;

create or replace function public.resolve_integrity_case(
  p_case_id uuid, p_outcome public.integrity_class, p_reason text, p_evidence_ids jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  target_artist uuid;
  decision_uuid uuid;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('analyst','head_of_ar','admin')
  ) then raise exception 'Integrity reviewer access is required.' using errcode = '42501'; end if;
  if p_outcome not in ('organic','paid_promo','unknown','suspicious','confirmed_invalid')
    or length(trim(coalesce(p_reason,''))) < 3 or jsonb_typeof(p_evidence_ids) is distinct from 'array' then
    raise exception 'A supported outcome, rationale, and evidence list are required.' using errcode = '22023';
  end if;
  if p_outcome = 'confirmed_invalid' and jsonb_array_length(p_evidence_ids) = 0 then
    raise exception 'Confirmed invalid requires at least one evidence reference.' using errcode = '22023';
  end if;
  select artist_id into target_artist from public.integrity_cases
    where id = p_case_id and status = 'open' and is_demo = false for update;
  if target_artist is null then raise exception 'Open operational case not found.' using errcode = '22023'; end if;
  update public.integrity_cases set status = 'resolved', resolution = trim(p_reason), resolved_at = now()
    where id = p_case_id;
  update public.artists set integrity = p_outcome where id = target_artist and is_demo = false;
  insert into public.integrity_decisions(case_id, artist_id, decided_by, outcome, reason, evidence_ids)
    values(p_case_id, target_artist, actor, p_outcome, trim(p_reason), p_evidence_ids)
    returning id into decision_uuid;
  insert into public.audit_log(actor_id, entity, entity_id, action, detail)
    values(actor, 'integrity_case', p_case_id, 'resolved', jsonb_build_object('outcome',p_outcome,'decision_id',decision_uuid,'evidence_ids',p_evidence_ids));
  return decision_uuid;
end $$;

create or replace function public.move_artist_stage(
  p_artist_id uuid, p_stage public.pipeline_stage, p_rationale text, p_evidence_refs jsonb default '[]'
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  previous_stage public.pipeline_stage;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('scout','analyst','artist_dev','head_of_ar','admin')
  ) then raise exception 'Workspace role is required.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_rationale,''))) < 3 or jsonb_typeof(p_evidence_refs) is distinct from 'array' then
    raise exception 'Stage changes require a rationale and evidence list.' using errcode = '22023'; end if;
  if p_stage = 'signed' and not exists (
    select 1 from public.user_roles where user_id = actor and role in ('head_of_ar','admin')
  ) then raise exception 'Only Head of A&R or Admin can mark an artist signed.' using errcode = '42501'; end if;
  select pipeline_stage into previous_stage from public.artists where id = p_artist_id and is_demo = false for update;
  if previous_stage is null then raise exception 'Operational artist not found.' using errcode = '22023'; end if;
  if p_stage = 'signed' and (select count(distinct reviewer_user_id) from public.artistic_reviews where artist_id = p_artist_id) < 2 then
    raise exception 'Signing consideration requires two independent human reviews.' using errcode = '22023'; end if;
  perform set_config('app.stage_rationale', trim(p_rationale), true);
  update public.artists set pipeline_stage = p_stage where id = p_artist_id;
  insert into public.workflow_history(artist_id, entity, from_state, to_state, changed_by, rationale, evidence_refs)
    values(p_artist_id, 'pipeline_stage', previous_stage::text, p_stage::text, actor, trim(p_rationale), p_evidence_refs);
end $$;

revoke all on function public.save_artistic_review(uuid,jsonb,text,text,jsonb) from public, anon;
revoke all on function public.resolve_integrity_case(uuid,public.integrity_class,text,jsonb) from public, anon;
revoke all on function public.move_artist_stage(uuid,public.pipeline_stage,text,jsonb) from public, anon;
grant execute on function public.save_artistic_review(uuid,jsonb,text,text,jsonb) to authenticated;
grant execute on function public.resolve_integrity_case(uuid,public.integrity_class,text,jsonb) to authenticated;
grant execute on function public.move_artist_stage(uuid,public.pipeline_stage,text,jsonb) to authenticated;

comment on table public.workflow_history is 'Actor-attributed pipeline transitions with rationale and evidence references.';
comment on table public.integrity_decisions is 'Immutable human integrity outcomes; suspicion remains a review status, not proof.';
