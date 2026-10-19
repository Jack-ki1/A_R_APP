-- Close the temporary public review-mode access. Team membership is represented
-- by a row in user_roles, so authenticated accounts without a role see no data.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke all on public.artist_notes from anon;
drop policy if exists "review mode add notes" on public.artist_notes;
revoke all on public.saved_searches, public.integrity_cases, public.artistic_reviews,
  public.alerts, public.dev_tasks from anon;
drop policy if exists "review mode access" on public.saved_searches;
drop policy if exists "review mode access" on public.integrity_cases;
drop policy if exists "review mode access" on public.artistic_reviews;
drop policy if exists "review mode access" on public.alerts;
drop policy if exists "review mode access" on public.dev_tasks;

grant select, insert, update, delete on public.saved_searches, public.integrity_cases,
  public.artistic_reviews, public.alerts, public.dev_tasks to authenticated;

create policy "team manages saved searches" on public.saved_searches
  for all to authenticated using (public.is_team(auth.uid()))
  with check (public.is_team(auth.uid()));
create policy "team manages integrity cases" on public.integrity_cases
  for all to authenticated using (public.is_team(auth.uid()))
  with check (public.is_team(auth.uid()));
create policy "team manages artistic reviews" on public.artistic_reviews
  for all to authenticated using (public.is_team(auth.uid()))
  with check (public.is_team(auth.uid()));
create policy "team manages alerts" on public.alerts
  for all to authenticated using (public.is_team(auth.uid()))
  with check (public.is_team(auth.uid()));
create policy "team manages development tasks" on public.dev_tasks
  for all to authenticated using (public.is_team(auth.uid()))
  with check (public.is_team(auth.uid()));

-- Never grant a role to a self-registered account. Invited users start as
-- Scouts; bootstrap the first admin explicitly through the trusted dashboard.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  if new.invited_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'scout')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

-- These helpers are used by RLS policies. Keep them out of the public RPC
-- surface so callers cannot enumerate membership for arbitrary user IDs.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_team(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_team(uuid) to authenticated, service_role;

-- Remove generated examples so they cannot be mistaken for operating data.
-- Dependent snapshots, demo cases, alerts, and notes cascade with each artist.
delete from public.artists where is_demo = true;

comment on table public.saved_searches is 'Private workspace data; access requires team membership.';
comment on table public.integrity_cases is 'Private workspace data; access requires team membership.';
comment on table public.artistic_reviews is 'Private workspace data; access requires team membership.';
comment on table public.alerts is 'Private workspace data; access requires team membership.';
comment on table public.dev_tasks is 'Private workspace data; access requires team membership.';
