-- 0016_student_progress_rpc.sql
-- RPC function to calculate student progress metrics

create or replace function get_student_progress(student_user_id uuid)
returns json as $$
declare
  total_assignments integer;
  completed_assignments integer;
  total_sessions integer;
  attended_sessions integer;
  progress_percentage numeric;
begin
  -- Count total assignments
  select count(*) into total_assignments
  from assignments;

  -- Count completed assignments (submitted with status 'reviewed' or 'graded')
  select count(distinct assignment_id) into completed_assignments
  from assignment_submissions
  where user_id = student_user_id
    and status in ('reviewed', 'graded');

  -- Count total sessions (completed or upcoming)
  select count(*) into total_sessions
  from sessions
  where status in ('completed', 'upcoming');

  -- Count attended sessions (from session_attendance table)
  select count(*) into attended_sessions
  from session_attendance
  where user_id = student_user_id
    and attended = true;

  -- Calculate overall progress percentage
  -- Weight: 60% from assignments, 40% from sessions
  if total_assignments > 0 and total_sessions > 0 then
    progress_percentage := round(
      (completed_assignments::numeric / total_assignments * 60) +
      (attended_sessions::numeric / total_sessions * 40),
      1
    );
  elsif total_assignments > 0 then
    progress_percentage := round(
      completed_assignments::numeric / total_assignments * 100,
      1
    );
  elsif total_sessions > 0 then
    progress_percentage := round(
      attended_sessions::numeric / total_sessions * 100,
      1
    );
  else
    progress_percentage := 0;
  end if;

  -- Return JSON with all metrics
  return json_build_object(
    'progress_percentage', progress_percentage,
    'total_assignments', total_assignments,
    'completed_assignments', completed_assignments,
    'total_sessions', total_sessions,
    'attended_sessions', attended_sessions
  );
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function get_student_progress(uuid) to authenticated;
