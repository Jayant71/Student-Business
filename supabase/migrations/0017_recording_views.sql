-- 0017_recording_views.sql
-- Track when students view recordings

create table if not exists public.recording_views (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamp with time zone default timezone('utc', now()),
  watch_duration integer, -- in seconds
  unique(recording_id, user_id) -- One entry per user per recording
);

create index if not exists idx_recording_views_recording on public.recording_views (recording_id);
create index if not exists idx_recording_views_user on public.recording_views (user_id);
create index if not exists idx_recording_views_viewed_at on public.recording_views (viewed_at);

-- Enable RLS
alter table public.recording_views enable row level security;

-- Students can view their own recording views
create policy "Students can view their own recording views"
  on public.recording_views
  for select
  using (auth.uid() = user_id);

-- Students can insert their own recording views
create policy "Students can insert their own recording views"
  on public.recording_views
  for insert
  with check (auth.uid() = user_id);

-- Students can update their own recording views (for watch duration)
create policy "Students can update their own recording views"
  on public.recording_views
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can view all recording views
create policy "Admins can view all recording views"
  on public.recording_views
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Grant permissions
grant select, insert, update on public.recording_views to authenticated;
