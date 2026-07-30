alter table public.profiles add column if not exists real_name text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles drop constraint if exists profiles_nickname_length;
alter table public.profiles add constraint profiles_nickname_length check (nickname is null or char_length(nickname) <= 7);

alter table public.quiz_attempts add column if not exists student_name text;
alter table public.quiz_attempts add column if not exists student_nickname text;
