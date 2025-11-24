-- 0015_admin_stats_rpc.sql
-- Admin Dashboard Statistics RPC Functions

-- Function to get comprehensive admin statistics
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  stats jsonb;
  total_leads_count int;
  emails_sent_count int;
  cta_approved_count int;
  payments_paid_count int;
  
  -- For trend calculations (vs 7 days ago)
  prev_total_leads int;
  prev_emails_sent int;
  prev_cta_approved int;
  prev_payments_paid int;
  
  lead_change numeric;
  email_change numeric;
  cta_change numeric;
  payment_change numeric;
begin
  -- Current counts
  select count(*) into total_leads_count from public.imported_leads;
  select count(*) into emails_sent_count from public.email_logs;
  select count(*) into cta_approved_count from public.cta_submissions where status = 'approved';
  select count(*) into payments_paid_count from public.payments where status = 'paid';
  
  -- Previous period counts (7 days ago)
  select count(*) into prev_total_leads 
  from public.imported_leads 
  where uploaded_at < now() - interval '7 days';
  
  select count(*) into prev_emails_sent 
  from public.email_logs 
  where sent_at < now() - interval '7 days';
  
  select count(*) into prev_cta_approved 
  from public.cta_submissions 
  where status = 'approved' and submission_date < now() - interval '7 days';
  
  select count(*) into prev_payments_paid 
  from public.payments 
  where status = 'paid' and created_at < now() - interval '7 days';
  
  -- Calculate percentage changes
  lead_change := case 
    when prev_total_leads > 0 then 
      round(((total_leads_count - prev_total_leads)::numeric / prev_total_leads * 100), 1)
    else 0 
  end;
  
  email_change := case 
    when prev_emails_sent > 0 then 
      round(((emails_sent_count - prev_emails_sent)::numeric / prev_emails_sent * 100), 1)
    else 0 
  end;
  
  cta_change := case 
    when prev_cta_approved > 0 then 
      round(((cta_approved_count - prev_cta_approved)::numeric / prev_cta_approved * 100), 1)
    else 0 
  end;
  
  payment_change := case 
    when prev_payments_paid > 0 then 
      round(((payments_paid_count - prev_payments_paid)::numeric / prev_payments_paid * 100), 1)
    else 0 
  end;
  
  -- Build the result JSON
  stats := jsonb_build_object(
    'total_leads', total_leads_count,
    'emails_sent', emails_sent_count,
    'cta_approved', cta_approved_count,
    'payments_paid', payments_paid_count,
    'lead_change', lead_change,
    'email_change', email_change,
    'cta_change', cta_change,
    'payment_change', payment_change,
    'last_updated', now()
  );
  
  return stats;
end;
$$;

-- Function to get recent activity feed
create or replace function public.get_recent_activity(limit_count int default 10)
returns jsonb
language plpgsql
security definer
as $$
declare
  activities jsonb;
begin
  with combined_activities as (
    -- CTA Submissions
    select 
      'cta_submission' as activity_type,
      id::text as activity_id,
      name as actor_name,
      email as actor_email,
      concat('New lead "', name, '" submitted enquiry') as description,
      submission_date as activity_time,
      jsonb_build_object('email', email, 'phone', phone, 'status', status) as metadata
    from public.cta_submissions
    
    union all
    
    -- Payments
    select 
      'payment' as activity_type,
      id::text as activity_id,
      coalesce(buyer_name, email) as actor_name,
      email as actor_email,
      concat('Payment of $', amount::text, ' ', status) as description,
      created_at as activity_time,
      jsonb_build_object('amount', amount, 'status', status, 'payment_id', payment_id) as metadata
    from public.payments
    where status = 'paid'
    
    union all
    
    -- Imported Leads
    select 
      'imported_lead' as activity_type,
      id::text as activity_id,
      name as actor_name,
      email as actor_email,
      concat('New lead "', name, '" imported') as description,
      uploaded_at as activity_time,
      jsonb_build_object('email', email, 'phone', phone, 'source', source, 'status', status) as metadata
    from public.imported_leads
    where uploaded_at > now() - interval '7 days'
  )
  select jsonb_agg(
    jsonb_build_object(
      'type', activity_type,
      'id', activity_id,
      'name', actor_name,
      'email', actor_email,
      'description', description,
      'time', activity_time,
      'metadata', metadata
    )
    order by activity_time desc
  )
  into activities
  from (
    select * from combined_activities
    order by activity_time desc
    limit limit_count
  ) recent;
  
  return coalesce(activities, '[]'::jsonb);
end;
$$;

-- Grant execute permissions to authenticated users (admin only in practice via RLS)
grant execute on function public.get_admin_stats() to authenticated;
grant execute on function public.get_recent_activity(int) to authenticated;

-- Add comment
comment on function public.get_admin_stats() is 'Returns comprehensive admin dashboard statistics with trends';
comment on function public.get_recent_activity(int) is 'Returns recent activity feed combining CTA submissions, payments, and leads';
