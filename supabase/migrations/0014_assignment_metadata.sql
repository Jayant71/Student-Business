-- 0014_assignment_metadata.sql

-- Add due_date column to assignments for scheduling submissions
alter table if exists public.assignments
  add column if not exists due_date timestamp with time zone;

comment on column public.assignments.due_date is 'Optional deadline for the assignment submission';

-- Capture mentor feedback on submissions
alter table if exists public.assignment_submissions
  add column if not exists feedback text;

-- Ensure a student can only have one submission per assignment to allow upserts
create unique index if not exists uniq_assignment_submission_per_student
  on public.assignment_submissions (assignment_id, user_id);
