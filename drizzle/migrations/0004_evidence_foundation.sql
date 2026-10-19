-- Additive evidence foundation for canonical intake and authorized imports.
-- Apply to an isolated staging database first; never reset existing data.

alter table public.artists
  alter column audience_current drop not null,
  alter column growth_30d drop not null,
  alter column expected_growth_30d drop not null,
  alter column evidence_confidence drop not null;

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  source_category text not null,
  rights_status text not null default 'unknown'
    check (rights_status in ('unknown','metadata_only','operator_documented','licensed','not_connected')),
  allowed_uses text[] not null default '{}',
  geographic_coverage text,
  reporting_lag text,
  retention_policy text,
  terms_reviewed_at timestamptz,
  config_status text not null default 'not_connected'
    check (config_status in ('not_connected','metadata_only','configured','paused')),
  refresh_cadence text not null default 'manual'
    check (refresh_cadence in ('manual','every_14_days','twice_monthly','every_2_months')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artist_source_accounts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  source text not null,
  external_artist_id text not null,
  profile_url text,
  match_status text not null default 'confirmed'
    check (match_status in ('candidate','confirmed','rejected')),
  match_confidence numeric check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source, external_artist_id)
);

create table public.candidate_intake (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  submitted_by uuid not null references auth.users(id),
  intake_source text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'monitoring_pending'
    check (status in ('identified','monitoring_pending','monitoring','rejected')),
  notes text,
  provenance_json jsonb not null default '{}',
  unique(artist_id, intake_source)
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id),
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running'
    check (status in ('running','succeeded','failed')),
  records_received integer not null default 0 check (records_received >= 0),
  records_accepted integer not null default 0 check (records_accepted >= 0),
  records_rejected integer not null default 0 check (records_rejected >= 0),
  error_code text,
  error_message text,
  provenance_json jsonb not null default '{}'
);

create table public.metric_observations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  source_id uuid not null references public.data_sources(id),
  ingestion_run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  platform_metric_name text not null,
  metric_definition_version text not null,
  start_at date not null,
  end_at date not null,
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  territory text,
  unit text not null,
  value_decimal numeric not null,
  rights_status_snapshot text not null,
  quality_status text not null default 'accepted'
    check (quality_status in ('accepted','pending_review','rejected','stale')),
  provenance_json jsonb not null default '{}',
  check (end_at >= start_at)
);

create unique index metric_observations_dedupe_idx on public.metric_observations
  (artist_id, source_id, platform_metric_name, metric_definition_version, start_at, end_at, coalesce(territory, ''));
create index metric_observations_artist_time_idx on public.metric_observations (artist_id, end_at desc);
create index ingestion_runs_source_status_idx on public.ingestion_runs (source_id, status);

insert into public.data_sources (provider, source_category, rights_status, allowed_uses, config_status)
values ('musicbrainz', 'identity_metadata', 'metadata_only', array['identity_resolution'], 'metadata_only')
on conflict (provider) do nothing;
insert into public.data_sources (provider, source_category, rights_status, allowed_uses, config_status, refresh_cadence)
values ('artist_authorized_audience_csv', 'artist_authorized_audience_export', 'unknown',
  array['internal_metrics','derived_metrics'], 'not_connected', 'manual')
on conflict (provider) do nothing;

alter table public.audience_snapshots
  add column cohort_scheme text not null default 'legacy_unknown',
  add column denominator_type text not null default 'unknown',
  add column coverage numeric check (coverage is null or (coverage >= 0 and coverage <= 1)),
  add column quality_status text not null default 'unknown',
  add column rights_status text not null default 'unknown',
  add column segment_counts jsonb not null default '{}',
  add column rights_reference text,
  add column provenance_json jsonb not null default '{}',
  add column source_id uuid references public.data_sources(id),
  add column ingestion_run_id uuid references public.ingestion_runs(id),
  add column source_import_key text unique;

alter table public.data_sources enable row level security;
alter table public.artist_source_accounts enable row level security;
alter table public.candidate_intake enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.metric_observations enable row level security;

grant select on public.data_sources, public.artist_source_accounts, public.candidate_intake,
  public.ingestion_runs, public.metric_observations to authenticated;
revoke insert, update, delete on public.data_sources, public.artist_source_accounts,
  public.candidate_intake, public.ingestion_runs, public.metric_observations from anon, authenticated;

create policy "team reads data sources" on public.data_sources for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads artist source accounts" on public.artist_source_accounts for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads candidate intake" on public.candidate_intake for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads ingestion runs" on public.ingestion_runs for select to authenticated using (public.is_team(auth.uid()));
create policy "team reads metric observations" on public.metric_observations for select to authenticated using (public.is_team(auth.uid()));

create or replace function public.intake_musicbrainz_candidate(
  p_mbid text,
  p_name text,
  p_area text,
  p_artist_type text,
  p_source_url text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  artist_uuid uuid;
begin
  if actor is null or not exists (select 1 from public.user_roles where user_id = actor) then
    raise exception 'Workspace access is required.' using errcode = '42501';
  end if;
  if p_mbid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or length(trim(p_name)) < 1 or length(p_name) > 200
    or p_source_url <> ('https://musicbrainz.org/artist/' || lower(p_mbid)) then
    raise exception 'Invalid MusicBrainz identity.' using errcode = '22023';
  end if;

  select artist_id into artist_uuid from public.artist_source_accounts
    where source = 'musicbrainz' and external_artist_id = lower(p_mbid);
  if artist_uuid is not null then
    update public.artist_source_accounts set match_status = 'confirmed', match_confidence = 1,
      verified_by = actor, verified_at = now()
      where source = 'musicbrainz' and external_artist_id = lower(p_mbid);
    insert into public.candidate_intake (artist_id, submitted_by, intake_source, status, provenance_json)
    values (artist_uuid, actor, 'musicbrainz', 'monitoring_pending',
      jsonb_build_object('source_url', p_source_url, 'external_artist_id', lower(p_mbid),
        'musicbrainz_area', nullif(trim(p_area), ''), 'confirmed_by_user', actor))
    on conflict (artist_id, intake_source) do nothing;
    return artist_uuid;
  end if;

  insert into public.artists (
    canonical_id, name, country, city, genre, language, stage,
    is_demo, unsigned, pipeline_stage, integrity, artistic_status,
    audience_current, growth_30d, expected_growth_30d, evidence_confidence,
    scores, series, events, evidence, why_now
  ) values (
    'musicbrainz:' || lower(p_mbid), trim(p_name), 'Unknown',
    'Unknown', 'Unknown', 'Unknown', coalesce(nullif(trim(p_artist_type), ''), 'Unknown'),
    false, true, 'identified', 'unknown', 'Not reviewed',
    null, null, null, null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
    jsonb_build_object('facts', jsonb_build_array('Identity record sourced from MusicBrainz.'),
      'limitations', jsonb_build_array('No audience or popularity observations have been imported.')),
    'Data collection pending'
  ) on conflict (canonical_id) do update set updated_at = public.artists.updated_at
  returning id into artist_uuid;

  insert into public.artist_source_accounts
    (artist_id, source, external_artist_id, profile_url, match_status, match_confidence, verified_by, verified_at)
  values (artist_uuid, 'musicbrainz', lower(p_mbid), p_source_url, 'confirmed', 1, actor, now())
  on conflict (source, external_artist_id) do update
    set artist_id = public.artist_source_accounts.artist_id
  returning artist_id into artist_uuid;

  insert into public.candidate_intake (artist_id, submitted_by, intake_source, status, provenance_json)
  values (artist_uuid, actor, 'musicbrainz', 'monitoring_pending',
    jsonb_build_object('source_url', p_source_url, 'external_artist_id', lower(p_mbid),
      'musicbrainz_area', nullif(trim(p_area), ''), 'confirmed_by_user', actor))
  on conflict (artist_id, intake_source) do nothing;
  return artist_uuid;
end $$;

create or replace function public.import_authorized_metric_rows(
  p_authorization_reference text,
  p_rows jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  source_uuid uuid;
  source_provider text;
  run_uuid uuid;
  row_json jsonb;
  artist_uuid uuid;
  received integer := 0;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('admin','head_of_ar','analyst')
  ) then raise exception 'Analyst access is required.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_authorization_reference, ''))) < 3 or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 5000 then
    raise exception 'Authorization reference and 1–5000 valid rows are required.' using errcode = '22023';
  end if;
  source_provider := lower(nullif(trim(p_rows->0->>'source'), ''));
  if source_provider is null or lower(source_provider) in ('musicbrainz','listenbrainz') or exists (
    select 1 from jsonb_array_elements(p_rows) as item(value)
    where lower(nullif(trim(item.value->>'source'), '')) is distinct from source_provider
  ) then
    raise exception 'Every row must name the same authorized metric source.' using errcode = '22023';
  end if;

  insert into public.data_sources (provider, source_category, rights_status, allowed_uses, geographic_coverage,
    retention_policy, config_status)
  values (source_provider, 'artist_authorized_export', 'operator_documented',
    array['internal_metrics','derived_metrics'], 'As supplied per observation',
    'Follow the authorization reference and source agreement; review before expiry.', 'configured')
  on conflict (provider) do update set rights_status = 'operator_documented',
    allowed_uses = array['internal_metrics','derived_metrics'], config_status = 'configured', updated_at = now()
  returning id into source_uuid;

  insert into public.ingestion_runs (source_id, started_by, status, records_received, provenance_json)
  values (source_uuid, actor, 'running', jsonb_array_length(p_rows),
    jsonb_build_object('authorization_reference', trim(p_authorization_reference), 'import_kind', 'csv'))
  returning id into run_uuid;

  for row_json in select value from jsonb_array_elements(p_rows) loop
    received := received + 1;
    select artist_id into artist_uuid from public.artist_source_accounts
      where source = 'musicbrainz' and external_artist_id = lower(row_json->>'mbid');
    if artist_uuid is null or jsonb_typeof(row_json) <> 'object'
      or coalesce(row_json->>'metric_name', '') = ''
      or (row_json->>'end_at')::date < (row_json->>'start_at')::date
      or coalesce(row_json->>'definition_version', 'operator_supplied_v1') = ''
      or coalesce(row_json->>'unit', '') = ''
      or coalesce(row_json->>'observed_at', '') = ''
      or coalesce(row_json->>'value', '') !~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$' then
      raise exception 'Invalid or unmatched CSV row %; import rolled back.', received using errcode = '22023';
    end if;
    insert into public.metric_observations (
      artist_id, source_id, ingestion_run_id, platform_metric_name, metric_definition_version,
      start_at, end_at, observed_at, territory, unit, value_decimal,
      rights_status_snapshot, quality_status, provenance_json
    ) values (
      artist_uuid, source_uuid, run_uuid, row_json->>'metric_name',
      coalesce(nullif(row_json->>'definition_version', ''), 'operator_supplied_v1'),
      (row_json->>'start_at')::date, (row_json->>'end_at')::date,
      (row_json->>'observed_at')::timestamptz, nullif(row_json->>'territory', ''),
      row_json->>'unit', (row_json->>'value')::numeric, 'operator_documented', 'accepted',
      jsonb_build_object('authorization_reference', trim(p_authorization_reference),
        'source_provider', source_provider, 'mbid', lower(row_json->>'mbid'))
    ) on conflict do nothing;
  end loop;

  update public.ingestion_runs set status = 'succeeded', ended_at = now(), records_accepted = received
    where id = run_uuid;
  return run_uuid;
end $$;

create or replace function public.import_authorized_audience_snapshots(
  p_authorization_reference text,
  p_snapshots jsonb
) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  source_uuid uuid;
  run_uuid uuid;
  snapshot_json jsonb;
  artist_uuid uuid;
  inserted_count integer := 0;
  snapshot_source text;
  import_key text;
  invalid_dimension boolean;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('admin','head_of_ar','analyst')
  ) then raise exception 'Analyst access is required.' using errcode = '42501'; end if;
  if length(trim(coalesce(p_authorization_reference, ''))) < 3 or jsonb_typeof(p_snapshots) <> 'array'
    or jsonb_array_length(p_snapshots) = 0 or jsonb_array_length(p_snapshots) > 1000 then
    raise exception 'Authorization reference and 1–1000 snapshots are required.' using errcode = '22023';
  end if;
  insert into public.data_sources (provider, source_category, rights_status, allowed_uses,
    geographic_coverage, retention_policy, config_status)
  values ('artist_authorized_audience_csv', 'artist_authorized_audience_export', 'operator_documented',
    array['internal_metrics','derived_metrics'], 'As supplied per observation',
    'Follow the authorization reference and source agreement; review before expiry.', 'configured')
  on conflict (provider) do update set rights_status = 'operator_documented',
    allowed_uses = array['internal_metrics','derived_metrics'], config_status = 'configured', updated_at = now()
  returning id into source_uuid;
  insert into public.ingestion_runs (source_id, started_by, status, records_received, provenance_json)
  values (source_uuid, actor, 'running', jsonb_array_length(p_snapshots),
    jsonb_build_object('authorization_reference', trim(p_authorization_reference), 'import_kind', 'audience_csv'))
  returning id into run_uuid;
  for snapshot_json in select value from jsonb_array_elements(p_snapshots) loop
    select artist_id into artist_uuid from public.artist_source_accounts
      where source = 'musicbrainz' and external_artist_id = lower(snapshot_json->>'mbid');
    snapshot_source := nullif(trim(snapshot_json->>'source'), '');
    if artist_uuid is null or jsonb_typeof(snapshot_json) <> 'object' or snapshot_source is null
      or coalesce(snapshot_json->>'cohort_scheme', '') in ('', 'legacy_unknown')
      or coalesce(snapshot_json->>'denominator_type', '') in ('', 'unknown')
      or (snapshot_json->>'window_days')::integer <= 0
      or (snapshot_json->>'total')::integer <= 0
      or nullif(snapshot_json->>'coverage', '') is null
      or (snapshot_json->>'coverage')::numeric < 0.8
      or (snapshot_json->>'coverage')::numeric > 1
      or jsonb_typeof(snapshot_json->'segments') <> 'object'
      or jsonb_typeof(snapshot_json->'segment_counts') <> 'object' then
      raise exception 'Invalid or unmatched audience snapshot; import rolled back.' using errcode = '22023';
    end if;
    select exists (
      select 1 from jsonb_each(snapshot_json->'segments') dimension
      where (select count(*) from jsonb_each(dimension.value)) <>
              (select count(*) from jsonb_each(coalesce(snapshot_json->'segment_counts'->dimension.key, '{}'::jsonb)) )
        or exists (select 1 from jsonb_each(dimension.value) share
          where jsonb_typeof(share.value) <> 'number'
            or (share.value #>> '{}')::numeric < 0 or (share.value #>> '{}')::numeric > 100)
        or abs((select coalesce(sum((segment.value #>> '{}')::numeric), 0)
          from jsonb_each(dimension.value) segment) - 100) > 1
        or exists (select 1 from jsonb_each(coalesce(snapshot_json->'segment_counts'->dimension.key, '{}'::jsonb)) count_segment
          where jsonb_typeof(count_segment.value) <> 'number'
            or (count_segment.value #>> '{}') !~ '^[0-9]+$')
        or (select coalesce(sum((segment.value #>> '{}')::integer), -1)
          from jsonb_each(coalesce(snapshot_json->'segment_counts'->dimension.key, '{}'::jsonb)) segment)
          <> (snapshot_json->>'total')::integer
        or exists (select 1 from jsonb_object_keys(dimension.value) as keys(segment_key)
          where not (coalesce(snapshot_json->'segment_counts'->dimension.key, '{}'::jsonb) ? keys.segment_key))
    ) into invalid_dimension;
    if invalid_dimension then
      raise exception 'Audience segments must reconcile to 100%% and actual counts to the denominator.' using errcode = '22023';
    end if;
    import_key := md5(artist_uuid::text || snapshot_source || (snapshot_json->>'reference_date') ||
      (snapshot_json->>'window_days') || (snapshot_json->>'cohort_scheme') || (snapshot_json->>'denominator_type'));
    insert into public.audience_snapshots (
      artist_id, reference_date, window_days, source, total, segments,
      cohort_scheme, denominator_type, coverage, quality_status, rights_status,
      segment_counts, rights_reference, provenance_json, source_id, ingestion_run_id, source_import_key
    ) values (
      artist_uuid, (snapshot_json->>'reference_date')::date, (snapshot_json->>'window_days')::integer,
      snapshot_source, (snapshot_json->>'total')::integer, snapshot_json->'segments',
      snapshot_json->>'cohort_scheme', snapshot_json->>'denominator_type',
      (snapshot_json->>'coverage')::numeric, 'accepted', 'operator_documented',
      snapshot_json->'segment_counts', trim(p_authorization_reference),
      jsonb_build_object('authorization_reference', trim(p_authorization_reference), 'import_kind', 'authorized_audience_csv'),
      source_uuid, run_uuid, import_key
    ) on conflict (source_import_key) do nothing;
    if found then inserted_count := inserted_count + 1; end if;
  end loop;
  update public.ingestion_runs set status = 'succeeded', ended_at = now(), records_accepted = inserted_count
    where id = run_uuid;
  return inserted_count;
end $$;

create or replace function public.set_audience_review_cadence(p_cadence text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role in ('admin','head_of_ar')
  ) then raise exception 'Head of A&R or admin access is required.' using errcode = '42501'; end if;
  if p_cadence not in ('manual','every_14_days','twice_monthly','every_2_months') then
    raise exception 'Unsupported audience review cadence.' using errcode = '22023';
  end if;
  update public.data_sources set refresh_cadence = p_cadence, updated_at = now()
    where provider = 'artist_authorized_audience_csv';
  if not found then raise exception 'Audience source registry is unavailable.'; end if;
  return p_cadence;
end $$;

revoke all on function public.intake_musicbrainz_candidate(text,text,text,text,text) from public, anon;
revoke all on function public.import_authorized_metric_rows(text,jsonb) from public, anon;
revoke all on function public.import_authorized_audience_snapshots(text,jsonb) from public, anon;
revoke all on function public.set_audience_review_cadence(text) from public, anon;
grant execute on function public.intake_musicbrainz_candidate(text,text,text,text,text) to authenticated;
grant execute on function public.import_authorized_metric_rows(text,jsonb) to authenticated;
grant execute on function public.import_authorized_audience_snapshots(text,jsonb) to authenticated;
grant execute on function public.set_audience_review_cadence(text) to authenticated;

comment on table public.metric_observations is 'Immutable sourced observations; values require source provenance and rights status.';
comment on table public.candidate_intake is 'Audited identity intake; new candidates start with monitoring pending and no metrics.';
comment on table public.data_sources is 'Provider rights/configuration registry; operator documented rights require separate governance review.';
