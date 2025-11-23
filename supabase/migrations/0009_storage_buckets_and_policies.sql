-- 0009_storage_buckets_and_policies.sql

-- Create storage buckets for assignments and recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('assignments', 'assignments', true, 10485760, ARRAY[
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'application/zip'
  ]),
  ('recordings', 'recordings', true, 524288000, ARRAY[
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
  ])
ON CONFLICT (id) DO NOTHING;

-- Row Level Security Policies for Assignments Bucket

-- Students can upload their own assignments
CREATE POLICY "Students can upload their own assignments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assignments' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can read their own assignments
CREATE POLICY "Students can read their own assignments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'assignments' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can read all assignments
CREATE POLICY "Admins can read all assignments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'assignments' AND 
  auth.role() = 'authenticated' AND 
  auth.jwt()->>'role' = 'admin'
);

-- Admins can update assignments
CREATE POLICY "Admins can update assignments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'assignments' AND 
  auth.role() = 'authenticated' AND 
  auth.jwt()->>'role' = 'admin'
);

-- Row Level Security Policies for Recordings Bucket

-- Admins can upload recordings
CREATE POLICY "Admins can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'recordings' AND 
  auth.role() = 'authenticated' AND 
  auth.jwt()->>'role' = 'admin'
);

-- Admins can update recordings
CREATE POLICY "Admins can update recordings" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'recordings' AND 
  auth.role() = 'authenticated' AND 
  auth.jwt()->>'role' = 'admin'
);

-- Authenticated users can read recordings
CREATE POLICY "Authenticated users can read recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'recordings' AND 
  auth.role() = 'authenticated'
);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;