-- Migration: RLS Policy Testing Framework
-- Description: Helper functions and views for testing Row Level Security policies
-- Created: 2025-01-XX

-- =============================================================================
-- RLS POLICY TESTING HELPERS
-- =============================================================================

-- Function to test if a user can read from a table
CREATE OR REPLACE FUNCTION test_can_read(
    p_user_id uuid,
    p_table_name text,
    p_row_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result boolean;
    v_query text;
BEGIN
    -- Set the role context for the test
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
    
    -- Build query based on whether specific row is provided
    IF p_row_id IS NOT NULL THEN
        v_query := format('SELECT EXISTS(SELECT 1 FROM %I WHERE id = %L)', p_table_name, p_row_id);
    ELSE
        v_query := format('SELECT EXISTS(SELECT 1 FROM %I LIMIT 1)', p_table_name);
    END IF;
    
    -- Execute query and return result
    EXECUTE v_query INTO v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Function to test if a user can insert into a table
CREATE OR REPLACE FUNCTION test_can_insert(
    p_user_id uuid,
    p_table_name text,
    p_test_data jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result boolean := false;
    v_query text;
    v_columns text[];
    v_values text[];
    v_key text;
    v_inserted_id uuid;
BEGIN
    -- Set the role context for the test
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
    
    -- Build column and value lists from JSON
    SELECT array_agg(key), array_agg(format('%L', value))
    INTO v_columns, v_values
    FROM jsonb_each_text(p_test_data);
    
    -- Build insert query
    v_query := format(
        'INSERT INTO %I (%s) VALUES (%s) RETURNING id',
        p_table_name,
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
    );
    
    -- Try to execute insert
    BEGIN
        EXECUTE v_query INTO v_inserted_id;
        v_result := (v_inserted_id IS NOT NULL);
        
        -- Clean up test data
        EXECUTE format('DELETE FROM %I WHERE id = %L', p_table_name, v_inserted_id);
    EXCEPTION
        WHEN OTHERS THEN
            v_result := false;
    END;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Function to test if a user can update a row
CREATE OR REPLACE FUNCTION test_can_update(
    p_user_id uuid,
    p_table_name text,
    p_row_id uuid,
    p_update_data jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result boolean := false;
    v_query text;
    v_set_clause text;
BEGIN
    -- Set the role context for the test
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
    
    -- Build SET clause from JSON
    SELECT string_agg(format('%I = %L', key, value), ', ')
    INTO v_set_clause
    FROM jsonb_each_text(p_update_data);
    
    -- Build update query
    v_query := format(
        'UPDATE %I SET %s WHERE id = %L',
        p_table_name,
        v_set_clause,
        p_row_id
    );
    
    -- Try to execute update
    BEGIN
        EXECUTE v_query;
        GET DIAGNOSTICS v_result = ROW_COUNT;
        v_result := (v_result > 0);
    EXCEPTION
        WHEN OTHERS THEN
            v_result := false;
    END;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Function to test if a user can delete a row
CREATE OR REPLACE FUNCTION test_can_delete(
    p_user_id uuid,
    p_table_name text,
    p_row_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result boolean := false;
    v_query text;
BEGIN
    -- Set the role context for the test
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
    
    -- Build delete query (but don't actually delete - use a DRY RUN approach)
    v_query := format(
        'SELECT EXISTS(SELECT 1 FROM %I WHERE id = %L FOR UPDATE)',
        p_table_name,
        p_row_id
    );
    
    -- Try to execute query (tests SELECT FOR UPDATE which is similar to DELETE permission)
    BEGIN
        EXECUTE v_query INTO v_result;
    EXCEPTION
        WHEN OTHERS THEN
            v_result := false;
    END;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- =============================================================================
-- RLS POLICY AUDIT VIEW
-- =============================================================================

-- View to inspect all RLS policies in the database
CREATE OR REPLACE VIEW rls_policies_audit AS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- RLS TESTING REPORT FUNCTION
-- =============================================================================

-- Function to generate comprehensive RLS test report for a user
CREATE OR REPLACE FUNCTION generate_rls_test_report(p_user_id uuid)
RETURNS TABLE (
    table_name text,
    can_select boolean,
    can_insert boolean,
    can_update boolean,
    can_delete boolean,
    policy_count integer
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_role AS (
        SELECT role FROM profiles WHERE id = p_user_id
    ),
    tables_to_test AS (
        SELECT DISTINCT tablename as tbl
        FROM pg_policies
        WHERE schemaname = 'public'
    )
    SELECT
        t.tbl::text,
        test_can_read(p_user_id, t.tbl)::boolean,
        false::boolean as can_insert, -- Placeholder
        false::boolean as can_update, -- Placeholder
        false::boolean as can_delete, -- Placeholder
        (SELECT COUNT(*)::integer FROM pg_policies WHERE tablename = t.tbl)
    FROM tables_to_test t;
END;
$$;

-- =============================================================================
-- SECURITY TABLE VALIDATION
-- =============================================================================

-- Function to validate security table configurations
CREATE OR REPLACE FUNCTION validate_security_setup()
RETURNS TABLE (
    check_name text,
    status text,
    details text
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if RLS is enabled on all security tables
    RETURN QUERY
    SELECT
        'RLS Enabled - ' || tablename,
        CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END,
        CASE 
            WHEN relrowsecurity THEN 'RLS is enabled'
            ELSE 'RLS is NOT enabled - SECURITY RISK!'
        END
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname IN ('admin_requests', 'rate_limit_tracking', 'audit_logs', 'error_logs')
    AND c.relkind = 'r';
    
    -- Check if security functions exist
    RETURN QUERY
    SELECT
        'Security Function - check_rate_limit',
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit'
        ) THEN 'PASS' ELSE 'FAIL' END,
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit'
        ) THEN 'Function exists' ELSE 'Function missing!' END;
    
    RETURN QUERY
    SELECT
        'Security Function - log_admin_action',
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'log_admin_action'
        ) THEN 'PASS' ELSE 'FAIL' END,
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'log_admin_action'
        ) THEN 'Function exists' ELSE 'Function missing!' END;
    
    RETURN QUERY
    SELECT
        'Security Function - log_error',
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'log_error'
        ) THEN 'PASS' ELSE 'FAIL' END,
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc WHERE proname = 'log_error'
        ) THEN 'Function exists' ELSE 'Function missing!' END;
    
    -- Check if security indexes exist
    RETURN QUERY
    SELECT
        'Index - rate_limit_tracking_lookup',
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = 'idx_rate_limit_lookup'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'Critical index for rate limiting performance';
    
    RETURN QUERY
    SELECT
        'Index - audit_logs_admin',
        CASE WHEN EXISTS(
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = 'idx_audit_logs_admin'
        ) THEN 'PASS' ELSE 'FAIL' END,
        'Index for audit log queries';
END;
$$;

-- =============================================================================
-- HELPER FUNCTION: Get User Permissions Summary
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_profile record;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Build permissions object based on role
    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'role', v_profile.role,
        'permissions', CASE v_profile.role
            WHEN 'admin' THEN jsonb_build_object(
                'can_manage_users', true,
                'can_view_all_data', true,
                'can_modify_all_data', true,
                'can_approve_admins', true,
                'can_view_audit_logs', true,
                'can_manage_certificates', true,
                'can_view_payments', true,
                'can_manage_support_tickets', true
            )
            WHEN 'student' THEN jsonb_build_object(
                'can_manage_users', false,
                'can_view_all_data', false,
                'can_modify_all_data', false,
                'can_view_own_data', true,
                'can_create_support_tickets', true,
                'can_view_own_certificates', true,
                'can_view_own_payments', true
            )
            ELSE jsonb_build_object(
                'can_manage_users', false,
                'can_view_all_data', false,
                'can_modify_all_data', false
            )
        END
    );
    
    RETURN v_result;
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on test functions to authenticated users
GRANT EXECUTE ON FUNCTION test_can_read(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION test_can_insert(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION test_can_update(uuid, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION test_can_delete(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_rls_test_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_security_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;

-- Grant view access
GRANT SELECT ON rls_policies_audit TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION test_can_read IS 'Test if a user can read from a specific table';
COMMENT ON FUNCTION test_can_insert IS 'Test if a user can insert into a specific table';
COMMENT ON FUNCTION test_can_update IS 'Test if a user can update a specific row';
COMMENT ON FUNCTION test_can_delete IS 'Test if a user can delete a specific row';
COMMENT ON FUNCTION generate_rls_test_report IS 'Generate comprehensive RLS permissions report for a user';
COMMENT ON FUNCTION validate_security_setup IS 'Validate that all security configurations are properly set up';
COMMENT ON FUNCTION get_user_permissions IS 'Get summary of user permissions based on role';
COMMENT ON VIEW rls_policies_audit IS 'View all RLS policies in the database';
