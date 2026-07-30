drop policy if exists "teachers read attempts for own works" on public.quiz_attempts;

create policy "teachers read attempts for own works"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.literary_works
      where literary_works.id = quiz_attempts.work_id
        and literary_works.teacher_id = auth.uid()
    )
  );
