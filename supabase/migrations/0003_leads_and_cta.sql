-- 0003_leads_and_cta.sql

-- Imported leads from CSV/Excel
create table if not exists public.imported_leads (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  name text,
  email text,
  phone text,
  source text default 'import',
  status imported_lead_status not null default 'pending',
  uploaded_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_imported_leads_admin on public.imported_leads (admin_id);
create index if not exists idx_imported_leads_status on public.imported_leads (status);

-- CTA Form submissions
create table if not exists public.cta_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer,
  email text not null,
  phone text not null,
  message text,
  status cta_status not null default 'new',
  submission_date timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_cta_status on public.cta_submissions (status);
create index if not exists idx_cta_email on public.cta_submissions (email);
