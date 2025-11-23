-- 0007_system_settings.sql

-- Admin settings (API keys, etc.)
create table if not exists public.admin_settings (
  admin_id uuid primary key references public.profiles (id) on delete cascade,
  sendgrid_key text,
  aisensy_key text,
  bolna_ai_key text,
  instamojo_key text,
  instamojo_secret text,
  from_email text,
  webhook_endpoints jsonb,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create or replace function public.set_admin_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_settings_updated_at on public.admin_settings;

create trigger trg_admin_settings_updated_at
before update on public.admin_settings
for each row
execute procedure public.set_admin_settings_updated_at();
