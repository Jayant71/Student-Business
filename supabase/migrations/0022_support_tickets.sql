-- Migration: 0022_support_tickets
-- Description: Support ticket system for student-admin communication
-- Created: 2025-11-24

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number varchar(20) UNIQUE NOT NULL,
    student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subject varchar(255) NOT NULL,
    description text NOT NULL,
    status varchar(20) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
    priority varchar(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category varchar(50),
    assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE support_tickets IS 'Support tickets for student inquiries and issues';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Human-readable ticket number (TKT-YYYYMMDD-XXXX)';
COMMENT ON COLUMN support_tickets.status IS 'Ticket status: open, in-progress, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority level';
COMMENT ON COLUMN support_tickets.category IS 'Ticket category (payment, technical, course, general)';

-- Create ticket_replies table for conversation threads
CREATE TABLE IF NOT EXISTS ticket_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message text NOT NULL,
    is_internal_note boolean DEFAULT FALSE,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE ticket_replies IS 'Replies and internal notes for support tickets';
COMMENT ON COLUMN ticket_replies.is_internal_note IS 'True if this is an admin-only internal note';

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
    reply_id uuid REFERENCES ticket_replies(id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    file_url text NOT NULL,
    file_size bigint,
    mime_type varchar(100),
    uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE ticket_attachments IS 'File attachments for support tickets';

-- Indexes for efficient queries
CREATE INDEX idx_tickets_student ON support_tickets(student_id);
CREATE INDEX idx_tickets_status ON support_tickets(status) WHERE status != 'closed';
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_ticket_replies_ticket ON ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_created ON ticket_replies(created_at);
CREATE INDEX idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS varchar
LANGUAGE plpgsql
AS $$
DECLARE
    new_ticket_number varchar;
    date_part varchar;
    counter integer;
BEGIN
    -- Format: TKT-YYYYMMDD-XXXX
    date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get count of tickets created today
    SELECT COUNT(*) + 1
    INTO counter
    FROM support_tickets
    WHERE ticket_number LIKE 'TKT-' || date_part || '%';
    
    -- Build ticket number
    new_ticket_number := 'TKT-' || date_part || '-' || LPAD(counter::text, 4, '0');
    
    RETURN new_ticket_number;
END;
$$;

COMMENT ON FUNCTION generate_ticket_number IS 'Generate sequential ticket number for the day';

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_number();

-- Row Level Security (RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own tickets
CREATE POLICY "Students can view own tickets"
    ON support_tickets
    FOR SELECT
    USING (
        auth.uid() = student_id
    );

-- Policy: Students can create tickets
CREATE POLICY "Students can create tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (
        auth.uid() = student_id
    );

-- Policy: Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update tickets
CREATE POLICY "Admins can update tickets"
    ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Students can view replies to their tickets
CREATE POLICY "Students can view own ticket replies"
    ON ticket_replies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_replies.ticket_id
            AND support_tickets.student_id = auth.uid()
        )
        AND is_internal_note = FALSE
    );

-- Policy: Students can reply to their tickets
CREATE POLICY "Students can reply to own tickets"
    ON ticket_replies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_replies.ticket_id
            AND support_tickets.student_id = auth.uid()
        )
        AND author_id = auth.uid()
    );

-- Policy: Admins can view all replies (including internal notes)
CREATE POLICY "Admins can view all replies"
    ON ticket_replies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can create replies
CREATE POLICY "Admins can create replies"
    ON ticket_replies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Students can view attachments for their tickets
CREATE POLICY "Students can view own ticket attachments"
    ON ticket_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_attachments.ticket_id
            AND support_tickets.student_id = auth.uid()
        )
    );

-- Policy: Users can upload attachments
CREATE POLICY "Users can upload attachments"
    ON ticket_attachments
    FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid()
    );

-- Policy: Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
    ON ticket_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Helper function: Get ticket with details
CREATE OR REPLACE FUNCTION get_ticket_details(ticket_uuid uuid)
RETURNS TABLE (
    id uuid,
    ticket_number varchar,
    subject varchar,
    description text,
    status varchar,
    priority varchar,
    category varchar,
    created_at timestamptz,
    updated_at timestamptz,
    student_name varchar,
    student_email varchar,
    assigned_to_name varchar,
    reply_count bigint,
    latest_reply_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.category,
        t.created_at,
        t.updated_at,
        p.full_name as student_name,
        p.email as student_email,
        a.full_name as assigned_to_name,
        COUNT(r.id) as reply_count,
        MAX(r.created_at) as latest_reply_at
    FROM support_tickets t
    JOIN profiles p ON t.student_id = p.id
    LEFT JOIN profiles a ON t.assigned_to = a.id
    LEFT JOIN ticket_replies r ON t.id = r.ticket_id
    WHERE t.id = ticket_uuid
    GROUP BY t.id, t.ticket_number, t.subject, t.description, t.status, t.priority, 
             t.category, t.created_at, t.updated_at, p.full_name, p.email, a.full_name;
END;
$$;

COMMENT ON FUNCTION get_ticket_details IS 'Get complete ticket details with student info and reply count';

-- Helper function: Get ticket statistics
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
    total_tickets bigint,
    open_tickets bigint,
    in_progress_tickets bigint,
    resolved_tickets bigint,
    avg_resolution_time interval
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets,
        AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time
    FROM support_tickets;
END;
$$;

COMMENT ON FUNCTION get_ticket_stats IS 'Get aggregated ticket statistics';

-- Insert sample categories
-- Categories can be added/managed by admins as needed
