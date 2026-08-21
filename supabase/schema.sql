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

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.literary_works(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text,
  student_nickname text,
  questions jsonb not null, answers jsonb not null default '{}'::jsonb,
  score numeric, completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.literary_works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.work_comments(id) on delete cascade,
  author_role text not null check (author_role in ('teacher', 'student')),
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists literary_works_published_idx on public.literary_works (published_at desc);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts (student_id, created_at desc);
create index if not exists work_comments_work_idx on public.work_comments (work_id, created_at);
create index if not exists work_comments_parent_idx on public.work_comments (parent_id, created_at);

alter table public.profiles enable row level security;
alter table public.literary_works enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.work_comments enable row level security;

create policy "public reads published works" on public.literary_works for select using (published_at is not null);
create policy "teachers manage own works" on public.literary_works for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "students create own profile" on public.profiles for insert with check (id = auth.uid() and role = 'student');
create policy "users read own attempts" on public.quiz_attempts for select using (student_id = auth.uid());
create policy "students create own attempts" on public.quiz_attempts for insert with check (student_id = auth.uid());
create policy "students update own attempts" on public.quiz_attempts for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teachers read attempts for own works" on public.quiz_attempts for select using (exists (select 1 from public.literary_works where literary_works.id = quiz_attempts.work_id and literary_works.teacher_id = auth.uid()));
create policy "public reads comments for published works" on public.work_comments for select using (exists (select 1 from public.literary_works where literary_works.id = work_comments.work_id and literary_works.published_at is not null));
create policy "users create own comments" on public.work_comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = work_comments.author_role) and (parent_id is null or author_role = 'teacher'));
create policy "users or work owners delete comments" on public.work_comments for delete to authenticated using (user_id = auth.uid() or exists (select 1 from public.literary_works where literary_works.id = work_comments.work_id and literary_works.teacher_id = auth.uid()));
