-- 0006_learning_content.sql

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  title text not null,
  description text,
  file_url text,
  created_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_assignments_session on public.assignments (session_id);

-- Assignment submissions
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_url text not null,
  submitted_at timestamp with time zone default timezone('utc', now()),
  status assignment_submission_status not null default 'submitted',
  grade text
);

create index if not exists idx_assignment_submissions_assignment on public.assignment_submissions (assignment_id);
create index if not exists idx_assignment_submissions_user on public.assignment_submissions (user_id);

-- Recordings
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  video_url text not null,
  visible_to_students boolean not null default true,
  uploaded_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_recordings_session on public.recordings (session_id);

-- Certificates
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_name text not null,
  issued_date timestamp with time zone default timezone('utc', now()),
  certificate_url text not null
);

create index if not exists idx_certificates_user on public.certificates (user_id);
