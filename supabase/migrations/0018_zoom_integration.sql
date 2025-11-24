-- Migration: Add Zoom Meeting Integration Fields
-- Description: Add zoom_meeting_id, zoom_join_url, and zoom metadata to sessions table
-- Supports: Manual meeting creation and automated workflows (payment success, cron jobs)

-- Add Zoom integration columns to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS zoom_join_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_start_url TEXT,
ADD COLUMN IF NOT EXISTS zoom_password TEXT,
ADD COLUMN IF NOT EXISTS zoom_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zoom_created_by TEXT DEFAULT 'manual', -- 'manual', 'webhook', 'cron', 'system'
ADD COLUMN IF NOT EXISTS zoom_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on zoom_meeting_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_zoom_meeting_id ON sessions(zoom_meeting_id);

-- Create index on session_date for cron job queries (sessions without Zoom meeting)
CREATE INDEX IF NOT EXISTS idx_sessions_date_no_zoom ON sessions(session_date, start_time) WHERE zoom_meeting_id IS NULL;

-- Add comment to document the fields
COMMENT ON COLUMN sessions.zoom_meeting_id IS 'Zoom meeting ID from Zoom API';
COMMENT ON COLUMN sessions.zoom_join_url IS 'Student join URL for Zoom meeting';
COMMENT ON COLUMN sessions.zoom_start_url IS 'Host start URL for Zoom meeting';
COMMENT ON COLUMN sessions.zoom_password IS 'Meeting password (if enabled)';
COMMENT ON COLUMN sessions.zoom_created_at IS 'Timestamp when Zoom meeting was created';
COMMENT ON COLUMN sessions.zoom_created_by IS 'Source of meeting creation: manual (admin UI), webhook (payment success), cron (scheduled job), system (automated)';
COMMENT ON COLUMN sessions.zoom_metadata IS 'Additional Zoom meeting metadata (uuid, host_id, recordings, etc.)';

-- Add recordings table for tracking Zoom cloud recordings
CREATE TABLE IF NOT EXISTS zoom_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    zoom_meeting_id TEXT NOT NULL,
    recording_id TEXT NOT NULL UNIQUE,
    recording_start TIMESTAMPTZ,
    recording_end TIMESTAMPTZ,
    file_type TEXT, -- MP4, M4A, CHAT, TRANSCRIPT, etc.
    file_size BIGINT,
    download_url TEXT,
    play_url TEXT,
    recording_type TEXT, -- shared_screen_with_speaker_view, audio_only, etc.
    status TEXT DEFAULT 'processing', -- processing, completed, available
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for zoom_recordings
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_session_id ON zoom_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_zoom_meeting_id ON zoom_recordings(zoom_meeting_id);
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_status ON zoom_recordings(status);
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_synced_at ON zoom_recordings(synced_at);

-- Add RLS policies for zoom_recordings
ALTER TABLE zoom_recordings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage zoom recordings" ON zoom_recordings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Students can view recordings for their sessions
CREATE POLICY "Students can view their session recordings" ON zoom_recordings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sessions s
        JOIN session_attendance sa ON sa.session_id = s.id
        WHERE s.id = zoom_recordings.session_id
        AND sa.user_id = auth.uid()
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zoom_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for zoom_recordings
DROP TRIGGER IF EXISTS trigger_update_zoom_recordings_updated_at ON zoom_recordings;
CREATE TRIGGER trigger_update_zoom_recordings_updated_at
    BEFORE UPDATE ON zoom_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_zoom_recordings_updated_at();
