-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  user_agent TEXT,
  url TEXT,
  type TEXT NOT NULL CHECK (type IN ('react-error-boundary', 'api-error', 'unhandled-rejection', 'network-error', 'custom')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- Create RLS policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own errors
CREATE POLICY "Users can view own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all errors
CREATE POLICY "Admins can view all errors" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert errors (for error logging service)
CREATE POLICY "System can insert errors" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can update errors (mark as resolved)
CREATE POLICY "Admins can update errors" ON error_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete errors
CREATE POLICY "Admins can delete errors" ON error_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(days INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_errors', COUNT(*)::int,
    'errors_by_type', jsonb_object_agg(type, type_count),
    'errors_by_severity', jsonb_object_agg(severity, severity_count),
    'recent_errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'error', error,
          'type', type,
          'severity', severity,
          'timestamp', timestamp,
          'user_id', user_id,
          'resolved', resolved
        )
      )
      FROM (
        SELECT id, error, type, severity, timestamp, user_id, resolved
        FROM error_logs
        WHERE created_at >= NOW() - INTERVAL '1 day' * days
        ORDER BY created_at DESC
        LIMIT 50
      ) recent
    ),
    'most_common_errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'error', error_key,
          'count', error_count,
          'last_occurred', max_timestamp
        )
      )
      FROM (
        SELECT 
          split_part(error, '\n', 1) as error_key,
          COUNT(*) as error_count,
          MAX(timestamp) as max_timestamp
        FROM error_logs
        WHERE created_at >= NOW() - INTERVAL '1 day' * days
        GROUP BY split_part(error, '\n', 1)
        ORDER BY error_count DESC
        LIMIT 10
      ) common
    )
  ) INTO result
  FROM (
    SELECT 
      COUNT(*) as total_count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '1 day' * days
  ) total,
  (
    SELECT type, COUNT(*) as type_count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '1 day' * days
    GROUP BY type
  ) type_stats,
  (
    SELECT severity, COUNT(*) as severity_count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '1 day' * days
    GROUP BY severity
  ) severity_stats;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear old errors
CREATE OR REPLACE FUNCTION clear_old_errors(days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_error_summary TO authenticated;
GRANT EXECUTE ON FUNCTION clear_old_errors TO authenticated;

-- Create view for error dashboard
CREATE OR REPLACE VIEW error_dashboard AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  type,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), type, severity
ORDER BY date DESC, error_count DESC;

-- Grant access to the view
GRANT SELECT ON error_dashboard TO authenticated;