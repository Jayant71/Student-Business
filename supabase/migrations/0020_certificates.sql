-- Migration: 0020_certificates
-- Description: Certificate system enhancements for course completion
-- Created: 2025-11-24

-- Add new columns to existing certificates table
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS certificate_id varchar(50) UNIQUE,
ADD COLUMN IF NOT EXISTS grade varchar(20),
ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revoked boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revoke_reason text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Rename columns to match new schema (if they don't already match)
DO $$ 
BEGIN
    -- Rename user_id to student_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='certificates' AND column_name='user_id') THEN
        ALTER TABLE certificates RENAME COLUMN user_id TO student_id;
    END IF;
    
    -- Rename issued_date to issued_at if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='certificates' AND column_name='issued_date' 
               AND data_type='timestamp with time zone') THEN
        ALTER TABLE certificates RENAME COLUMN issued_date TO issued_at;
        ALTER TABLE certificates ALTER COLUMN issued_at TYPE date USING issued_at::date;
    END IF;
    
    -- Rename certificate_url to file_url if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='certificates' AND column_name='certificate_url') THEN
        ALTER TABLE certificates RENAME COLUMN certificate_url TO file_url;
    END IF;
END $$;

-- Create certificates storage bucket (run this manually via Supabase Dashboard or Storage API)
-- Storage bucket name: 'certificates'
-- Public: false (secure download URLs only)
-- File size limit: 5MB
-- Allowed MIME types: application/pdf

COMMENT ON TABLE certificates IS 'Course completion certificates issued to students';
COMMENT ON COLUMN certificates.certificate_id IS 'Unique certificate identifier (CERT-YYYYMMDD-HASH)';
COMMENT ON COLUMN certificates.grade IS 'Grade or score achieved (optional)';
COMMENT ON COLUMN certificates.file_url IS 'Supabase Storage URL for PDF certificate';
COMMENT ON COLUMN certificates.revoked IS 'Whether certificate has been revoked';

-- Indexes for efficient queries (drop old index first)
DROP INDEX IF EXISTS idx_certificates_user;
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_certificates_issued_date ON certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_lookup ON certificates(certificate_id) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_name);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_certificates_updated_at ON certificates;
CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own certificates
CREATE POLICY "Students can view own certificates"
    ON certificates
    FOR SELECT
    USING (
        auth.uid() = student_id
        AND revoked = FALSE
    );

-- Policy: Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
    ON certificates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can insert certificates
CREATE POLICY "Admins can insert certificates"
    ON certificates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update certificates (for revocation)
CREATE POLICY "Admins can update certificates"
    ON certificates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Helper function: Get student certificate count
CREATE OR REPLACE FUNCTION get_student_certificate_count(student_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cert_count integer;
BEGIN
    SELECT COUNT(*)
    INTO cert_count
    FROM certificates
    WHERE student_id = student_uuid
    AND revoked = FALSE;
    
    RETURN cert_count;
END;
$$;

COMMENT ON FUNCTION get_student_certificate_count IS 'Get count of non-revoked certificates for a student';

-- Helper function: Verify certificate by ID (public access)
CREATE OR REPLACE FUNCTION verify_certificate_public(cert_id varchar)
RETURNS TABLE (
    valid boolean,
    certificate_id varchar,
    student_name varchar,
    course_name varchar,
    issued_at date,
    grade varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as valid,
        c.certificate_id,
        p.full_name as student_name,
        c.course_name,
        c.issued_at,
        c.grade
    FROM certificates c
    JOIN profiles p ON c.student_id = p.id
    WHERE c.certificate_id = cert_id
    AND c.revoked = FALSE
    LIMIT 1;
    
    -- If no results, return invalid
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE, NULL::varchar, NULL::varchar, NULL::varchar, NULL::date, NULL::varchar;
    END IF;
END;
$$;

COMMENT ON FUNCTION verify_certificate_public IS 'Public function to verify certificate authenticity';

-- Sample data (optional - for testing)
-- INSERT INTO certificates (certificate_id, student_id, course_name, issued_at, grade, file_url)
-- SELECT 
--     'CERT-20251124-TEST01',
--     id,
--     'Introduction to Python',
--     '2025-11-24',
--     'A+',
--     'https://storage.example.com/certificates/CERT-20251124-TEST01.pdf'
-- FROM profiles
-- WHERE role = 'student'
-- LIMIT 1;
