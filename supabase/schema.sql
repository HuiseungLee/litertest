create table if not exists public.literature_results (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  grade text not null,
  subject text not null,
  work_title text not null,
  work_author text,
  generated_result jsonb not null,
  model_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists literature_results_student_created_idx
  on public.literature_results (student_id, created_at desc);

alter table public.literature_results enable row level security;

-- The application writes through a server-only Service Role key. Do not expose it to browsers.
