-- Run once in the Supabase SQL Editor before deploying the Q&A interface.
create table if not exists public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.literary_works(id) on delete cascade,
  user_id uuid not null,
  parent_id uuid references public.work_comments(id) on delete cascade,
  author_role text not null check (author_role in ('teacher', 'student')),
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Existing installations may still have the original cascading profile foreign key.
-- Removing only this foreign key preserves the author's UUID for ownership checks.
alter table public.work_comments
  drop constraint if exists work_comments_user_id_fkey;

create index if not exists work_comments_work_idx on public.work_comments (work_id, created_at);
create index if not exists work_comments_parent_idx on public.work_comments (parent_id, created_at);

alter table public.work_comments enable row level security;

drop policy if exists "public reads comments for published works" on public.work_comments;
create policy "public reads comments for published works"
  on public.work_comments for select
  using (exists (
    select 1 from public.literary_works
    where literary_works.id = work_comments.work_id
      and literary_works.published_at is not null
  ));

drop policy if exists "users create own comments" on public.work_comments;
create policy "users create own comments"
  on public.work_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = work_comments.author_role
    )
    and (parent_id is null or author_role = 'teacher')
  );

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
