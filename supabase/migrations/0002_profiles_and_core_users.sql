-- 0002_profiles_and_core_users.sql

-- PROFILES table – one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'student',
  email text not null unique,
  phone text,
  name text,
  parent_name text,
  parent_contact text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Helpful index
create index if not exists idx_profiles_role on public.profiles (role);

-- Basic RLS (you can refine later)
alter table public.profiles enable row level security;

-- Students can see only themselves
create policy "Students can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Students can update only themselves (optional)
create policy "Students can update own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Admin policy – allow admins to view all profiles
-- (You will refine with a function to check admin role later if needed)
