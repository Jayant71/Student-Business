-- 0001_enable_extensions_and_enums.sql

-- Enable useful extensions (Supabase usually has these already)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ========== ENUM TYPES ==========

-- User roles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'student');
  end if;
end$$;

-- Imported lead status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'imported_lead_status') then
    create type imported_lead_status as enum ('pending', 'emailed', 'error');
  end if;
end$$;

-- CTA submission status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cta_status') then
    create type cta_status as enum ('new', 'approved', 'rejected');
  end if;
end$$;

-- Email status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type email_status as enum ('sent', 'delivered', 'failed');
  end if;
end$$;

-- WhatsApp message status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'whatsapp_status') then
    create type whatsapp_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');
  end if;
end$$;

-- Call status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_status') then
    create type call_status as enum ('completed', 'failed', 'retry');
  end if;
end$$;

-- CRM channels
do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_channel') then
    create type crm_channel as enum ('email', 'whatsapp', 'call');
  end if;
end$$;

-- CRM sender
do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_sender') then
    create type crm_sender as enum ('admin', 'user');
  end if;
end$$;

-- Payment status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'paid', 'failed');
  end if;
end$$;

-- Session status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('upcoming', 'ongoing', 'completed');
  end if;
end$$;

-- Reminder channel
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reminder_channel') then
    create type reminder_channel as enum ('email', 'whatsapp');
  end if;
end$$;

-- Assignment submission status (optional but useful)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'assignment_submission_status') then
    create type assignment_submission_status as enum ('submitted', 'graded');
  end if;
end$$;
