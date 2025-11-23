-- 0010_crm_realtime_enhancements.sql

-- Add message status tracking columns to crm_messages
alter table public.crm_messages 
add column if not exists delivery_status text check (delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed')) default 'pending',
add column if not exists read_at timestamp with time zone,
add column if not exists delivered_at timestamp with time zone,
add column if not exists external_message_id text,
add column if not exists temp_id text; -- For optimistic UI updates

-- Create indexes for new columns
create index if not exists idx_crm_delivery_status on public.crm_messages (delivery_status);
create index if not exists idx_crm_temp_id on public.crm_messages (temp_id);

-- Create typing indicators table
create table if not exists public.typing_indicators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  contact_id uuid references public.profiles (id) on delete cascade,
  is_typing boolean not null default false,
  channel crm_channel not null,
  timestamp timestamp with time zone default timezone('utc', now()),
  last_seen timestamp with time zone default timezone('utc', now())
);

-- Create indexes for typing indicators
create index if not exists idx_typing_user_contact on public.typing_indicators (user_id, contact_id);
create index if not exists idx_typing_contact on public.typing_indicators (contact_id);
create index if not exists idx_typing_timestamp on public.typing_indicators (timestamp);

-- Create message sync status table for offline support
create table if not exists public.message_sync_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  contact_id uuid references public.profiles (id) on delete cascade,
  last_sync timestamp with time zone default timezone('utc', now()),
  pending_count integer default 0,
  failed_count integer default 0,
  is_online boolean default true,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Create indexes for sync status
create index if not exists idx_sync_user_contact on public.message_sync_status (user_id, contact_id);
create index if not exists idx_sync_updated_at on public.message_sync_status (updated_at);

-- Create function to clean up old typing indicators (older than 30 seconds)
create or replace function cleanup_old_typing_indicators()
returns void as $$
begin
  delete from public.typing_indicators 
  where timestamp < timezone('utc', now()) - interval '30 seconds';
end;
$$ language plpgsql;

-- Create function to update typing indicator with upsert
create or replace function upsert_typing_indicator(
  p_user_id uuid,
  p_contact_id uuid,
  p_is_typing boolean,
  p_channel crm_channel
)
returns void as $$
begin
  insert into public.typing_indicators (user_id, contact_id, is_typing, channel, timestamp)
  values (p_user_id, p_contact_id, p_is_typing, p_channel, timezone('utc', now()))
  on conflict (user_id, contact_id, channel) 
  do update set
    is_typing = p_is_typing,
    timestamp = timezone('utc', now()),
    last_seen = timezone('utc', now());
end;
$$ language plpgsql;

-- Enable RLS for new tables
alter table public.typing_indicators enable row level security;
alter table public.message_sync_status enable row level security;

-- RLS policies for typing indicators
drop policy if exists "Users can view typing indicators for their conversations" on public.typing_indicators;
create policy "Users can view typing indicators for their conversations"
  on public.typing_indicators for select
  using (
    user_id = auth.uid() or
    contact_id = auth.uid()
  );

drop policy if exists "Users can insert their own typing indicators" on public.typing_indicators;
create policy "Users can insert their own typing indicators"
  on public.typing_indicators for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own typing indicators" on public.typing_indicators;
create policy "Users can update their own typing indicators"
  on public.typing_indicators for update
  using (user_id = auth.uid());

-- RLS policies for message sync status
drop policy if exists "Users can view their own sync status" on public.message_sync_status;
create policy "Users can view their own sync status"
  on public.message_sync_status for select
  using (user_id = auth.uid());

drop policy if exists "Users can update their own sync status" on public.message_sync_status;
create policy "Users can update their own sync status"
  on public.message_sync_status for all
  using (user_id = auth.uid());

-- Create scheduled cleanup job (requires pg_cron extension)
-- Uncomment if pg_cron is available
-- select cron.schedule('cleanup-typing-indicators', '*/10 * * * *', 'select cleanup_old_typing_indicators();');