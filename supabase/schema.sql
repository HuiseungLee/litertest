create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  display_name text,
  real_name text,
  nickname text check (char_length(nickname) <= 7),
  created_at timestamptz not null default now()
);

create table if not exists public.literary_works (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  title text not null, author text, genre text, source_text text, theme text,
  expression_features text, summary text, commentary text not null,
  generated_result jsonb not null default '{}'::jsonb, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.literary_works(id) on delete cascade,
  -- Keep the author's UUID as an ownership snapshot without a foreign key so
  -- Q&A remains after the member deletes their account.
  user_id uuid not null,
  parent_id uuid references public.work_comments(id) on delete cascade,
  author_role text not null check (author_role in ('teacher', 'student')),
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.app_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create index if not exists literary_works_published_idx on public.literary_works (published_at desc);
create index if not exists work_comments_work_idx on public.work_comments (work_id, created_at);
create index if not exists work_comments_parent_idx on public.work_comments (parent_id, created_at);

alter table public.profiles enable row level security;
alter table public.literary_works enable row level security;
alter table public.work_comments enable row level security;
alter table public.app_schema_migrations enable row level security;
grant select on public.app_schema_migrations to service_role;

create policy "public reads published works" on public.literary_works for select using (published_at is not null);
create policy "teachers manage own works" on public.literary_works for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "students create own profile" on public.profiles for insert with check (id = auth.uid() and role = 'student');
create policy "public reads comments for published works" on public.work_comments for select using (exists (select 1 from public.literary_works where literary_works.id = work_comments.work_id and literary_works.published_at is not null));
create policy "users create own comments" on public.work_comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = work_comments.author_role) and (parent_id is null or author_role = 'teacher'));
create policy "authors or teachers delete comments" on public.work_comments for delete to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'teacher'));

insert into public.app_schema_migrations (version)
values ('2026-08-28-retain-comments-drop-learning')
on conflict (version) do nothing;
