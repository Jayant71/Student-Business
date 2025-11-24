-- Migration: Performance Optimization Indexes
-- Description: Add comprehensive indexes to improve query performance across all tables
-- Created: 2025-01-XX

-- =============================================================================
-- PROFILES TABLE INDEXES
-- =============================================================================

-- Index for email lookups (used frequently in authentication)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Index for last activity tracking
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity_at DESC NULLS LAST);

-- Composite index for active users by role
CREATE INDEX IF NOT EXISTS idx_profiles_role_activity ON profiles(role, last_activity_at DESC);

-- =============================================================================
-- IMPORTED LEADS TABLE INDEXES
-- =============================================================================

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_imported_leads_uploaded_at ON imported_leads(uploaded_at DESC);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_imported_leads_source ON imported_leads(source);

-- Note: idx_imported_leads_status already exists from 0003_leads_and_cta.sql

-- Composite index for lead management dashboard
CREATE INDEX IF NOT EXISTS idx_imported_leads_status_date ON imported_leads(status, uploaded_at DESC);

-- Index for phone number lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_imported_leads_phone ON imported_leads(phone);

-- =============================================================================
-- CTA SUBMISSIONS TABLE INDEXES
-- =============================================================================

-- Index for date-based queries (note: column is submission_date, not submitted_at)
CREATE INDEX IF NOT EXISTS idx_cta_submissions_date ON cta_submissions(submission_date DESC);

-- Note: idx_cta_status already exists from 0003_leads_and_cta.sql

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_cta_submissions_email ON cta_submissions(email);

-- =============================================================================
-- CRM MESSAGES TABLE INDEXES
-- =============================================================================

-- Note: idx_crm_user, idx_crm_admin, idx_crm_channel already exist from 0004_communications_and_crm.sql
-- Note: idx_crm_messages_thread, idx_crm_messages_important, idx_crm_messages_archived already exist from 0021_crm_enhancements.sql

-- Index for user (contact) with timestamp
CREATE INDEX IF NOT EXISTS idx_crm_messages_user_timestamp ON crm_messages(user_id, timestamp DESC);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_crm_messages_content_search ON crm_messages USING gin(to_tsvector('english', message));

-- =============================================================================
-- CONTACT TAGS INDEXES
-- =============================================================================

-- Index for tag name lookups
CREATE INDEX IF NOT EXISTS idx_contact_tags_name ON contact_tags(name);

-- Index for tag color filtering
CREATE INDEX IF NOT EXISTS idx_contact_tags_color ON contact_tags(color);

-- =============================================================================
-- CONTACT TAG ASSIGNMENTS INDEXES
-- =============================================================================

-- Index for contact-based tag queries
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_contact ON contact_tag_assignments(contact_id);

-- Index for tag-based contact queries
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_tag ON contact_tag_assignments(tag_id);

-- Composite index for efficient tag filtering
CREATE INDEX IF NOT EXISTS idx_contact_tag_assignments_composite ON contact_tag_assignments(contact_id, tag_id);

-- =============================================================================
-- SESSIONS TABLE INDEXES
-- =============================================================================

-- Note: idx_sessions_date and idx_sessions_status already exist from 0005_payments_and_sessions.sql
-- Note: idx_sessions_date_no_zoom created in 0018_zoom_integration.sql

-- Composite index for upcoming sessions (using session_date and start_time, not scheduled_at)
CREATE INDEX IF NOT EXISTS idx_sessions_status_date ON sessions(status, session_date, start_time) 
    WHERE status IN ('upcoming', 'ongoing');

-- =============================================================================
-- SESSION ATTENDANCE TABLE INDEXES
-- =============================================================================

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_session_attendance_user ON session_attendance(user_id);

-- Index for attendance tracking
CREATE INDEX IF NOT EXISTS idx_session_attendance_attended ON session_attendance(attended);

-- Composite index for user session history
CREATE INDEX IF NOT EXISTS idx_session_attendance_user_session ON session_attendance(user_id, session_id);

-- =============================================================================
-- ZOOM RECORDINGS TABLE INDEXES
-- =============================================================================

-- Note: idx_zoom_recordings_session_id, idx_zoom_recordings_zoom_meeting_id, idx_zoom_recordings_status, idx_zoom_recordings_synced_at
-- already exist from 0018_zoom_integration.sql

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_date ON zoom_recordings(recording_start DESC);

-- Index for available recordings (using status column)
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_available ON zoom_recordings(status) WHERE status = 'available';

-- =============================================================================
-- ASSIGNMENTS TABLE INDEXES
-- =============================================================================

-- Index for due date queries
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Index for session-based queries (note: already exists from 0006_learning_content.sql)
-- Note: idx_assignments_due_date_reminders already exists from 0019_automation_workflows.sql

-- =============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE INDEXES
-- =============================================================================

-- Note: idx_assignment_submissions_assignment and idx_assignment_submissions_user already exist from 0006_learning_content.sql

-- Index for grading status
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);

-- Index for submitted date
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_date ON assignment_submissions(submitted_at DESC);

-- =============================================================================
-- PAYMENTS TABLE INDEXES
-- =============================================================================

-- Note: idx_payments_user and idx_payments_status already exist from 0005_payments_and_sessions.sql

-- Index for payment date (using paid_at column, not payment_date)
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_at DESC);

-- Composite index for user payment history
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, paid_at DESC);

-- Index for pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending ON payments(status, created_at) 
    WHERE status = 'pending';

-- =============================================================================
-- PAYMENT LINKS TABLE INDEXES
-- =============================================================================

-- Note: payment_links table structure varies, indexes skipped
-- TODO: Add indexes once payment_links schema is finalized

-- =============================================================================
-- LEAD CAMPAIGNS TABLE INDEXES
-- =============================================================================

-- Index for campaign status
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_status ON lead_campaigns(status);

-- Index for creation date
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_created ON lead_campaigns(created_at DESC);

-- =============================================================================
-- JOB EXECUTION LOGS TABLE INDEXES
-- =============================================================================

-- Note: idx_job_logs_name_date and idx_job_logs_status already exist from 0019_automation_workflows.sql

-- Composite index for recent failed jobs
CREATE INDEX IF NOT EXISTS idx_job_logs_failed_recent ON job_execution_logs(status, started_at DESC) 
    WHERE status = 'failed';

-- =============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- =============================================================================

-- Note: idx_notifications_user and idx_notifications_created already exist from 0019_automation_workflows.sql

-- Index for unread notifications (column is 'read', not 'is_read')
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) 
    WHERE NOT read;

-- Index for notification type (column is 'type', not 'notification_type')
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =============================================================================
-- CERTIFICATES TABLE INDEXES
-- =============================================================================

-- Note: After migration 0020, certificates table has been enhanced
-- Note: idx_certificates_student already exists from 0020_certificates.sql as idx_certificates_student
-- Note: idx_certificates_issued_date already exists from 0020_certificates.sql

-- Index for certificate_id lookups (unique identifier)
CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON certificates(certificate_id) WHERE certificate_id IS NOT NULL;

-- Index for revoked certificates (column is 'revoked', not 'is_revoked')
CREATE INDEX IF NOT EXISTS idx_certificates_revoked_enhanced ON certificates(revoked, issued_at) WHERE revoked = true;

-- Composite index for student certificates
CREATE INDEX IF NOT EXISTS idx_certificates_student_date ON certificates(student_id, issued_at DESC);

-- =============================================================================
-- SUPPORT TICKETS TABLE INDEXES
-- =============================================================================

-- Index for student queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_student ON support_tickets(student_id);

-- Index for ticket number (unique lookups)
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Index for priority
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Index for assigned admin
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to) 
    WHERE assigned_to IS NOT NULL;

-- Composite index for ticket management
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority 
    ON support_tickets(status, priority, created_at DESC);

-- Index for open tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_open ON support_tickets(status, created_at DESC) 
    WHERE status IN ('open', 'in_progress');

-- =============================================================================
-- TICKET REPLIES TABLE INDEXES
-- =============================================================================

-- Index for ticket queries
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id, created_at);

-- Index for author queries
CREATE INDEX IF NOT EXISTS idx_ticket_replies_author ON ticket_replies(author_id);

-- Index for internal notes
CREATE INDEX IF NOT EXISTS idx_ticket_replies_internal ON ticket_replies(is_internal_note) 
    WHERE is_internal_note = true;

-- =============================================================================
-- AUDIT LOGS TABLE INDEXES (from Phase 6)
-- =============================================================================

-- Note: idx_audit_logs_user, idx_audit_logs_action, idx_audit_logs_resource, idx_audit_logs_created
-- already exist from 0023_security_enhancements.sql

-- Additional composite index for user action history (table has user_id, not admin_id)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);

-- Index for resource queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_composite 
    ON audit_logs(resource_type, resource_id, created_at DESC);

-- =============================================================================
-- ERROR LOGS TABLE INDEXES (from Phase 6)
-- =============================================================================

-- Note: Most error_logs indexes already exist from 0011_error_logs.sql
-- (idx_error_logs_timestamp, idx_error_logs_user_id, idx_error_logs_type, 
--  idx_error_logs_severity, idx_error_logs_resolved, idx_error_logs_created_at)

-- Index for unresolved errors by severity
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_unresolved 
    ON error_logs(severity, created_at DESC) WHERE NOT resolved;

-- =============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =============================================================================

-- Update statistics for query optimizer
ANALYZE profiles;
ANALYZE imported_leads;
ANALYZE cta_submissions;
ANALYZE crm_messages;
ANALYZE contact_tags;
ANALYZE contact_tag_assignments;
ANALYZE sessions;
ANALYZE session_attendance;
ANALYZE zoom_recordings;
ANALYZE assignments;
ANALYZE assignment_submissions;
ANALYZE payments;
ANALYZE lead_campaigns;
ANALYZE job_execution_logs;
ANALYZE notifications;
ANALYZE certificates;
ANALYZE support_tickets;
ANALYZE ticket_replies;
ANALYZE audit_logs;
ANALYZE error_logs;

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    total_size text,
    index_size text,
    toast_size text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) AS index_size,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - 
                      pg_relation_size(schemaname || '.' || tablename) - 
                      pg_indexes_size(schemaname || '.' || tablename)) AS toast_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
END;
$$;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION find_missing_indexes()
RETURNS TABLE (
    table_name text,
    column_name text,
    seq_scans bigint,
    idx_scans bigint,
    suggestion text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename AS table_name,
        attname AS column_name,
        seq_scan AS seq_scans,
        COALESCE(idx_scan, 0) AS idx_scans,
        'Consider adding index on ' || attname AS suggestion
    FROM pg_stat_user_tables t
    JOIN pg_attribute a ON a.attrelid = t.relid
    LEFT JOIN pg_index i ON i.indrelid = a.attrelid AND a.attnum = ANY(i.indkey)
    WHERE t.schemaname = 'public'
    AND seq_scan > 1000
    AND COALESCE(idx_scan, 0) < seq_scan / 10
    AND a.attnum > 0
    AND NOT a.attisdropped
    ORDER BY seq_scan DESC
    LIMIT 20;
END;
$$;

-- Function to get slow query insights
CREATE OR REPLACE FUNCTION get_query_performance_summary()
RETURNS TABLE (
    query_text text,
    calls bigint,
    total_time_ms numeric,
    mean_time_ms numeric,
    max_time_ms numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(query, 100) AS query_text,
        calls,
        ROUND(total_exec_time::numeric, 2) AS total_time_ms,
        ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
        ROUND(max_exec_time::numeric, 2) AS max_time_ms
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
    ORDER BY mean_exec_time DESC
    LIMIT 20;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pg_stat_statements extension not enabled';
        RETURN;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION get_table_stats IS 'Get statistics about table sizes and row counts';
COMMENT ON FUNCTION find_missing_indexes IS 'Identify columns that might benefit from indexes';
COMMENT ON FUNCTION get_query_performance_summary IS 'Get performance metrics for slow queries (requires pg_stat_statements)';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION find_missing_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_performance_summary() TO authenticated;
