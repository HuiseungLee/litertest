-- Run this file once in the self-hosted Supabase SQL Editor before deploying
-- the account-deletion update. It removes obsolete learning records and keeps
-- Q&A content after its author deletes their account.

begin;

alter table if exists public.work_comments
  drop constraint if exists work_comments_user_id_fkey;

drop policy if exists "users or work owners delete comments" on public.work_comments;
drop policy if exists "authors or teachers delete comments" on public.work_comments;
create policy "authors or teachers delete comments"
  on public.work_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'teacher'
    )
  );

-- Learning attempts are no longer part of the service. This permanently
-- removes all existing attempt records, indexes, and policies with the table.
drop table if exists public.quiz_attempts cascade;

create table if not exists public.app_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_migrations enable row level security;
grant select on public.app_schema_migrations to service_role;
insert into public.app_schema_migrations (version)
values ('2026-08-28-retain-comments-drop-learning')
on conflict (version) do nothing;

commit;
