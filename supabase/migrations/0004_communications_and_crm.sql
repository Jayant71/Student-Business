-- 0004_communications_and_crm.sql

-- Email logs (SendGrid)
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email_address text not null,
  template_name text,
  status email_status not null default 'sent',
  sent_at timestamp with time zone default timezone('utc', now()),
  response_data jsonb
);

create index if not exists idx_email_logs_user on public.email_logs (user_id);
create index if not exists idx_email_logs_status on public.email_logs (status);

-- WhatsApp logs (AiSensy)
create table if not exists public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  phone text not null,
  template_name text,
  direction text check (direction in ('inbound', 'outbound')) not null default 'outbound',
  message text,
  status whatsapp_status not null default 'queued',
  timestamp timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_whatsapp_logs_user on public.whatsapp_logs (user_id);
create index if not exists idx_whatsapp_logs_status on public.whatsapp_logs (status);

-- Call scripts (for Bolna.ai) - optional but referenced
create table if not exists public.call_scripts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  script_text text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Call logs (Bolna.ai)
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  phone text not null,
  call_script_id uuid references public.call_scripts (id) on delete set null,
  status call_status not null default 'completed',
  call_recording_url text,
  duration_seconds integer,
  timestamp timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_call_logs_user on public.call_logs (user_id);
create index if not exists idx_call_logs_status on public.call_logs (status);

-- Unified CRM messages
create table if not exists public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  channel crm_channel not null,
  sender crm_sender not null,
  message text not null,
  meta jsonb,
  timestamp timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_crm_user on public.crm_messages (user_id);
create index if not exists idx_crm_admin on public.crm_messages (admin_id);
create index if not exists idx_crm_channel on public.crm_messages (channel);
