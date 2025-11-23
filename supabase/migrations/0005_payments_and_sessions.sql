-- 0005_payments_and_sessions.sql

-- Payments (Instamojo)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  payment_request_id text,
  payment_id text,
  amount numeric(10,2),
  status payment_status not null default 'pending',
  payment_url text,
  paid_at timestamp with time zone,
  webhook_payload jsonb,
  created_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_payments_status on public.payments (status);

-- Sessions (classes)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  session_date date not null,
  start_time time not null,
  meeting_link text,
  status session_status not null default 'upcoming',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_sessions_date on public.sessions (session_date);
create index if not exists idx_sessions_status on public.sessions (status);

-- Session attendance
create table if not exists public.session_attendance (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attended boolean default false,
  joined_at timestamp with time zone,
  primary key (session_id, user_id)
);

-- Reminders sent (email / WhatsApp)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  channel reminder_channel not null,
  sent_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_reminders_session on public.reminders (session_id);
create index if not exists idx_reminders_user on public.reminders (user_id);
