-- Migration: Automation Workflow Tables
-- Description: Add tables and fields needed for automation workflows
-- Phase: 4 - Automation Workflows

-- ============================================
-- Lead Campaign Management
-- ============================================

CREATE TABLE IF NOT EXISTS lead_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL,
    total_leads INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
    conversions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add campaign tracking to imported_leads
ALTER TABLE imported_leads
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES lead_campaigns(id),
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_day3_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_day7_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cta_submission_id UUID REFERENCES cta_submissions(id),
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Index for campaign lookups
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON imported_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON imported_leads(status);

-- ============================================
-- Session Reminder Tracking
-- ============================================

-- Add reminder flags to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE;

-- Index for reminder queries (using session_date and start_time)
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_reminders 
ON sessions(session_date, start_time) WHERE reminder_24h_sent = FALSE OR reminder_15min_sent = FALSE;

-- ============================================
-- Recording Notifications
-- ============================================

-- Add notification flag to recordings table
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_recordings_notifications 
ON recordings(visible_to_students, notification_sent) WHERE notification_sent = FALSE;

-- ============================================
-- Assignment Reminders
-- ============================================

-- Add reminder flag to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Index for due_date queries (assignments that need reminders)
CREATE INDEX IF NOT EXISTS idx_assignments_due_date_reminders 
ON assignments(due_date) WHERE reminder_sent = FALSE AND due_date IS NOT NULL;

-- ============================================
-- Payment Reminders
-- ============================================

-- Add reminder flag to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Index for pending payment queries
CREATE INDEX IF NOT EXISTS idx_payments_pending_reminders 
ON payments(status, created_at) WHERE status = 'pending' AND reminder_sent = FALSE;

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- cta_approved, payment_received, session_reminder, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Optional link to relevant page
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- RLS Policies for Notifications
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can create notifications
CREATE POLICY "Admins can create notifications"
ON notifications
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to increment campaign conversions
CREATE OR REPLACE FUNCTION increment_campaign_conversions(campaign_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE lead_campaigns
    SET conversions = conversions + 1,
        updated_at = now()
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = user_uuid AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET read = TRUE
    WHERE user_id = user_uuid AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Job Execution Log Table
-- ============================================

CREATE TABLE IF NOT EXISTS job_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL, -- success, failed
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS idx_job_logs_name_date ON job_execution_logs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_execution_logs(status);

-- ============================================
-- Update Timestamps Trigger
-- ============================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to lead_campaigns
DROP TRIGGER IF EXISTS update_lead_campaigns_updated_at ON lead_campaigns;
CREATE TRIGGER update_lead_campaigns_updated_at
BEFORE UPDATE ON lead_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================

-- Uncomment for development testing

-- INSERT INTO notifications (user_id, type, title, message, read) VALUES
-- ((SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), 'test', 'Test Notification', 'This is a test notification', false);

-- ============================================
-- Migration Complete
-- ============================================

COMMENT ON TABLE lead_campaigns IS 'Tracks email campaigns for imported leads';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE job_execution_logs IS 'Logs for background job executions';

-- Migration successful!
