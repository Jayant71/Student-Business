-- 0008_rpc_functions.sql

-- 1) Create or update profile for the currently authenticated user
--    Call this from your client app right after signup.
create or replace function public.create_profile_for_current_user(
  p_name text,
  p_phone text,
  p_role user_role default 'student',
  p_parent_name text default null,
  p_parent_contact text default null
)
returns public.profiles
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_email text;
  v_profile public.profiles;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'No auth user found for current uid';
  end if;

  insert into public.profiles (id, role, email, name, phone, parent_name, parent_contact)
  values (v_user_id, p_role, v_email, p_name, p_phone, p_parent_name, p_parent_contact)
  on conflict (id) do update
    set role = excluded.role,
        email = excluded.email,
        name = excluded.name,
        phone = excluded.phone,
        parent_name = excluded.parent_name,
        parent_contact = excluded.parent_contact
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.create_profile_for_current_user(text, text, user_role, text, text)
to authenticated, anon;

-- 2) Get current user's profile
create or replace function public.get_my_profile()
returns public.profiles
language sql
security definer
as $$
  select *
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.get_my_profile()
to authenticated;

-- 3) Simple admin-only RPC to update CTA status (approve/reject)
--    You can protect this later with RLS and an is_admin() helper.
create or replace function public.update_cta_status(
  p_cta_id uuid,
  p_status cta_status
)
returns public.cta_submissions
language plpgsql
security definer
as $$
declare
  v_row public.cta_submissions;
begin
  update public.cta_submissions
  set status = p_status
  where id = p_cta_id
  returning * into v_row;

  if not found then
    raise exception 'CTA submission not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_cta_status(uuid, cta_status)
to authenticated;

-- 4) Dashboard stats for admin (simple example)
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language sql
security definer
as $$
  select jsonb_build_object(
    'total_leads', (select count(*) from public.imported_leads),
    'emails_sent', (select count(*) from public.email_logs where status = 'sent'),
    'cta_new', (select count(*) from public.cta_submissions where status = 'new'),
    'cta_approved', (select count(*) from public.cta_submissions where status = 'approved'),
    'payments_paid', (select count(*) from public.payments where status = 'paid'),
    'upcoming_sessions', (select count(*) from public.sessions where status = 'upcoming')
  );
$$;

grant execute on function public.get_admin_dashboard_stats()
to authenticated;
