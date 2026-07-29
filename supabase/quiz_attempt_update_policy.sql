drop policy if exists "students update own attempts" on public.quiz_attempts;

create policy "students update own attempts"
  on public.quiz_attempts for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
