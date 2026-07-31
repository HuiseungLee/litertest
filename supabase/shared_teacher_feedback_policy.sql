-- Run once in Supabase SQL Editor to let every teacher account review all student attempts.
drop policy if exists "teachers read attempts for own works" on public.quiz_attempts;
drop policy if exists "teachers read all attempts" on public.quiz_attempts;

create policy "teachers read all attempts"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'teacher'
    )
  );
