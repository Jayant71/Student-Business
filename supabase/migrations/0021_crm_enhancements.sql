-- Migration: 0021_crm_enhancements
-- Description: Enhanced CRM features with tags, filters, and message threading
-- Created: 2025-11-24

-- Create contact_tags table for tagging/labeling contacts
CREATE TABLE IF NOT EXISTS contact_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(50) NOT NULL UNIQUE,
    color varchar(20) DEFAULT 'gray',
    description text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE contact_tags IS 'Tags/labels for categorizing CRM contacts';

-- Create contact_tag_assignments junction table
CREATE TABLE IF NOT EXISTS contact_tag_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tag_id uuid REFERENCES contact_tags(id) ON DELETE CASCADE NOT NULL,
    assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at timestamptz DEFAULT now(),
    UNIQUE(contact_id, tag_id)
);

COMMENT ON TABLE contact_tag_assignments IS 'Assignment of tags to contacts';

-- Add additional fields to crm_messages for threading and organization
ALTER TABLE crm_messages
ADD COLUMN IF NOT EXISTS thread_id uuid,
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES crm_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN crm_messages.thread_id IS 'Groups messages into conversation threads';
COMMENT ON COLUMN crm_messages.parent_message_id IS 'Reference to parent message for replies';
COMMENT ON COLUMN crm_messages.is_important IS 'Flag for important/starred messages';
COMMENT ON COLUMN crm_messages.is_archived IS 'Flag for archived messages';
COMMENT ON COLUMN crm_messages.metadata IS 'Additional message metadata (attachments, etc.)';

-- Add last_activity_at to profiles for contact sorting
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

COMMENT ON COLUMN profiles.last_activity_at IS 'Last activity timestamp for CRM sorting';

-- Create indexes for efficient queries
CREATE INDEX idx_contact_tags_name ON contact_tags(name);
CREATE INDEX idx_contact_tag_assignments_contact ON contact_tag_assignments(contact_id);
CREATE INDEX idx_contact_tag_assignments_tag ON contact_tag_assignments(tag_id);
CREATE INDEX idx_crm_messages_thread ON crm_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_crm_messages_parent ON crm_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_crm_messages_important ON crm_messages(is_important) WHERE is_important = TRUE;
CREATE INDEX idx_crm_messages_archived ON crm_messages(is_archived);
CREATE INDEX idx_profiles_last_activity ON profiles(last_activity_at DESC) WHERE role = 'student';

-- Row Level Security (RLS)
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage tags
CREATE POLICY "Admins can view tags"
    ON contact_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert tags"
    ON contact_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update tags"
    ON contact_tags
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can manage tag assignments
CREATE POLICY "Admins can view tag assignments"
    ON contact_tag_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert tag assignments"
    ON contact_tag_assignments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete tag assignments"
    ON contact_tag_assignments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Helper function: Get contacts with tags
CREATE OR REPLACE FUNCTION get_contacts_with_tags()
RETURNS TABLE (
    id uuid,
    full_name varchar,
    email varchar,
    phone varchar,
    role varchar,
    last_activity_at timestamptz,
    tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        p.role,
        p.last_activity_at,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', ct.id,
                    'name', ct.name,
                    'color', ct.color
                )
            ) FILTER (WHERE ct.id IS NOT NULL),
            '[]'::json
        )::jsonb as tags
    FROM profiles p
    LEFT JOIN contact_tag_assignments cta ON p.id = cta.contact_id
    LEFT JOIN contact_tags ct ON cta.tag_id = ct.id
    WHERE p.role = 'student'
    GROUP BY p.id, p.full_name, p.email, p.phone, p.role, p.last_activity_at
    ORDER BY p.last_activity_at DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION get_contacts_with_tags IS 'Get all contacts with their assigned tags';

-- Helper function: Update last activity timestamp
CREATE OR REPLACE FUNCTION update_contact_last_activity(contact_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET last_activity_at = now()
    WHERE id = contact_uuid;
END;
$$;

COMMENT ON FUNCTION update_contact_last_activity IS 'Update last activity timestamp for a contact';

-- Trigger to update last activity when message is sent/received
CREATE OR REPLACE FUNCTION update_last_activity_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update last activity for the contact (user)
    UPDATE profiles
    SET last_activity_at = NEW.timestamp
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_last_activity_on_message
    AFTER INSERT ON crm_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity_on_message();

-- Helper function: Search messages with filters
CREATE OR REPLACE FUNCTION search_crm_messages(
    search_text text DEFAULT NULL,
    contact_filter uuid DEFAULT NULL,
    channel_filter varchar DEFAULT NULL,
    important_only boolean DEFAULT FALSE,
    archived_filter boolean DEFAULT FALSE
)
RETURNS TABLE (
    id uuid,
    contact_id uuid,
    sender varchar,
    message text,
    channel varchar,
    message_timestamp timestamptz,
    delivery_status varchar,
    thread_id uuid,
    is_important boolean,
    contact_name varchar,
    contact_email varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.user_id as contact_id,
        m.sender,
        m.message,
        m.channel,
        m.timestamp,
        m.delivery_status,
        m.thread_id,
        m.is_important,
        p.full_name as contact_name,
        p.email as contact_email
    FROM crm_messages m
    JOIN profiles p ON m.user_id = p.id
    WHERE 
        (search_text IS NULL OR m.message ILIKE '%' || search_text || '%')
        AND (contact_filter IS NULL OR m.user_id = contact_filter)
        AND (channel_filter IS NULL OR m.channel = channel_filter)
        AND (NOT important_only OR m.is_important = TRUE)
        AND m.is_archived = archived_filter
    ORDER BY m.timestamp DESC;
END;
$$;

COMMENT ON FUNCTION search_crm_messages IS 'Search CRM messages with multiple filters';

-- Insert default tags
INSERT INTO contact_tags (name, color, description) VALUES
    ('Hot Lead', 'red', 'High-priority potential customers'),
    ('Warm Lead', 'orange', 'Engaged but not ready to purchase'),
    ('Cold Lead', 'blue', 'Initial contact made'),
    ('Active Student', 'green', 'Currently enrolled and active'),
    ('At Risk', 'yellow', 'May need additional support'),
    ('VIP', 'purple', 'High-value customers'),
    ('Follow-up Required', 'pink', 'Needs immediate attention'),
    ('Payment Pending', 'amber', 'Awaiting payment')
ON CONFLICT (name) DO NOTHING;

-- Update existing profiles with last_activity_at from latest message
UPDATE profiles p
SET last_activity_at = (
    SELECT MAX(timestamp)
    FROM crm_messages m
    WHERE m.user_id = p.id
)
WHERE role = 'student'
AND EXISTS (
    SELECT 1 FROM crm_messages m
    WHERE m.user_id = p.id
);
