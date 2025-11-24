-- Migration: 0023_security_enhancements
-- Description: Admin verification, rate limiting, and security features
-- Created: 2025-11-24

-- Create admin_requests table for admin verification workflow
CREATE TABLE IF NOT EXISTS admin_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) UNIQUE NOT NULL,
    full_name varchar(255) NOT NULL,
    phone varchar(20),
    reason text NOT NULL,
    status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    rejection_reason text,
    verification_token varchar(255),
    token_expires_at timestamptz
);

COMMENT ON TABLE admin_requests IS 'Admin access requests awaiting approval';
COMMENT ON COLUMN admin_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN admin_requests.verification_token IS 'Email verification token';

-- Create rate_limit_tracking table for API rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier varchar(255) NOT NULL, -- IP address or user ID
    endpoint varchar(255) NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamptz DEFAULT now(),
    blocked_until timestamptz,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE rate_limit_tracking IS 'Track API request rates for rate limiting';
COMMENT ON COLUMN rate_limit_tracking.identifier IS 'IP address or user ID';
COMMENT ON COLUMN rate_limit_tracking.window_start IS 'Start of current rate limit window';
COMMENT ON COLUMN rate_limit_tracking.blocked_until IS 'Timestamp until which requests are blocked';

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    action varchar(100) NOT NULL,
    resource_type varchar(50),
    resource_id varchar(255),
    details jsonb DEFAULT '{}'::jsonb,
    ip_address varchar(45),
    user_agent text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Audit trail of admin actions and important events';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., create, update, delete, approve)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource (e.g., user, payment, certificate)';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action';

-- Enhance existing error_logs table (created in 0011_error_logs.sql)
-- Add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='error_message') THEN
        ALTER TABLE error_logs ADD COLUMN error_message text;
        -- Populate from existing 'error' column
        UPDATE error_logs SET error_message = error WHERE error_message IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='request_url') THEN
        ALTER TABLE error_logs ADD COLUMN request_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='request_method') THEN
        ALTER TABLE error_logs ADD COLUMN request_method varchar(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='request_payload') THEN
        ALTER TABLE error_logs ADD COLUMN request_payload jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='resolved_at') THEN
        ALTER TABLE error_logs ADD COLUMN resolved_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='error_logs' AND column_name='resolved_by') THEN
        ALTER TABLE error_logs ADD COLUMN resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON TABLE error_logs IS 'Application error logs for debugging and monitoring';
COMMENT ON COLUMN error_logs.severity IS 'Error severity level';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_requests_email ON admin_requests(email);
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_start);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
-- Note: error_logs indexes already created in 0011_error_logs.sql

-- Row Level Security (RLS)
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create admin requests
CREATE POLICY "Anyone can create admin requests"
    ON admin_requests
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can view their own admin request
CREATE POLICY "Users can view own admin request"
    ON admin_requests
    FOR SELECT
    USING (email = auth.jwt()->>'email');

-- Policy: Admins can view all admin requests
CREATE POLICY "Admins can view all admin requests"
    ON admin_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update admin requests
CREATE POLICY "Admins can update admin requests"
    ON admin_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Only system can manage rate limits (no direct user access)
CREATE POLICY "No direct access to rate limits"
    ON rate_limit_tracking
    FOR ALL
    USING (false);

-- Policy: Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy: Admins can view error logs
CREATE POLICY "Admins can view error logs"
    ON error_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: System can insert error logs
CREATE POLICY "System can insert error logs"
    ON error_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy: Admins can update error logs (mark as resolved)
CREATE POLICY "Admins can update error logs"
    ON error_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Helper function: Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier varchar,
    p_endpoint varchar,
    p_max_requests integer,
    p_window_seconds integer
)
RETURNS TABLE (
    allowed boolean,
    remaining integer,
    reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count integer;
    v_window_start timestamptz;
    v_blocked_until timestamptz;
BEGIN
    -- Check if currently blocked
    SELECT rate_limit_tracking.blocked_until
    INTO v_blocked_until
    FROM rate_limit_tracking
    WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND blocked_until > now()
    LIMIT 1;
    
    IF v_blocked_until IS NOT NULL THEN
        RETURN QUERY SELECT 
            FALSE as allowed,
            0 as remaining,
            v_blocked_until as reset_at;
        RETURN;
    END IF;
    
    -- Get or create rate limit record
    INSERT INTO rate_limit_tracking (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) 
    WHERE window_start > now() - (p_window_seconds || ' seconds')::interval
    DO UPDATE SET 
        request_count = rate_limit_tracking.request_count + 1
    RETURNING request_count, window_start
    INTO v_current_count, v_window_start;
    
    -- Check if limit exceeded
    IF v_current_count > p_max_requests THEN
        -- Block for remaining window time
        UPDATE rate_limit_tracking
        SET blocked_until = v_window_start + (p_window_seconds || ' seconds')::interval
        WHERE identifier = p_identifier AND endpoint = p_endpoint;
        
        RETURN QUERY SELECT 
            FALSE as allowed,
            0 as remaining,
            (v_window_start + (p_window_seconds || ' seconds')::interval) as reset_at;
    ELSE
        RETURN QUERY SELECT 
            TRUE as allowed,
            (p_max_requests - v_current_count) as remaining,
            (v_window_start + (p_window_seconds || ' seconds')::interval) as reset_at;
    END IF;
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS 'Check if request is within rate limit';

-- Helper function: Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_user_id uuid,
    p_action varchar,
    p_resource_type varchar,
    p_resource_id varchar,
    p_details jsonb DEFAULT '{}'::jsonb,
    p_ip_address varchar DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        details, ip_address, user_agent
    )
    VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_details, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_admin_action IS 'Log an admin action to audit trail';

-- Helper function: Log error
CREATE OR REPLACE FUNCTION log_error(
    p_error_type varchar,
    p_error_message text,
    p_stack_trace text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_request_url text DEFAULT NULL,
    p_request_method varchar DEFAULT NULL,
    p_request_payload jsonb DEFAULT NULL,
    p_severity varchar DEFAULT 'error'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_id uuid;
BEGIN
    INSERT INTO error_logs (
        type, error, stack, user_id,
        url, context, severity
    )
    VALUES (
        p_error_type, p_error_message, p_stack_trace, p_user_id,
        p_request_url, 
        jsonb_build_object(
            'method', p_request_method,
            'payload', p_request_payload
        ),
        p_severity
    )
    RETURNING id INTO v_error_id;
    
    RETURN v_error_id;
END;
$$;

COMMENT ON FUNCTION log_error IS 'Log an application error';

-- Helper function: Get unresolved errors count
CREATE OR REPLACE FUNCTION get_unresolved_errors_count()
RETURNS TABLE (
    total_errors bigint,
    critical_errors bigint,
    error_errors bigint,
    warning_errors bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_errors,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
        COUNT(*) FILTER (WHERE severity = 'error') as error_errors,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_errors
    FROM error_logs
    WHERE resolved = FALSE;
END;
$$;

COMMENT ON FUNCTION get_unresolved_errors_count IS 'Get count of unresolved errors by severity';

-- Clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM rate_limit_tracking
    WHERE window_start < now() - interval '1 hour'
    AND (blocked_until IS NULL OR blocked_until < now());
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Clean up old rate limit tracking records';

-- Add composite index for rate limiting (without time-based predicate since now() is not IMMUTABLE)
CREATE UNIQUE INDEX idx_rate_limit_unique ON rate_limit_tracking(identifier, endpoint, window_start);
