import { supabase } from './supabase';

export const storageBuckets = {
  assignments: 'assignments',
  recordings: 'recordings'
};

export const initializeStorageBuckets = async () => {
  try {
    // Create assignments bucket if it doesn't exist
    const { data: assignmentsBucket, error: assignmentsError } = await supabase.storage.getBucket(storageBuckets.assignments);
    
    if (assignmentsError && assignmentsError.message.includes('not found')) {
      const { error } = await supabase.storage.createBucket(storageBuckets.assignments, {
        public: true,
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'application/zip'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        console.error('Error creating assignments bucket:', error);
      } else {
        console.log('Assignments bucket created successfully');
      }
    }

    // Create recordings bucket if it doesn't exist
    const { data: recordingsBucket, error: recordingsError } = await supabase.storage.getBucket(storageBuckets.recordings);
    
    if (recordingsError && recordingsError.message.includes('not found')) {
      const { error } = await supabase.storage.createBucket(storageBuckets.recordings, {
        public: true,
        allowedMimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'],
        fileSizeLimit: 524288000 // 500MB
      });
      
      if (error) {
        console.error('Error creating recordings bucket:', error);
      } else {
        console.log('Recordings bucket created successfully');
      }
    }

    // Set up Row Level Security policies for assignments bucket
    await setupAssignmentsPolicies();
    
    // Set up Row Level Security policies for recordings bucket
    await setupRecordingsPolicies();
    
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
  }
};

const setupAssignmentsPolicies = async () => {
  try {
    // Policy for students to upload their own assignments
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.assignments,
      policy_name: 'Students can upload their own assignments',
      definition: `auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()`,
      policy_type: 'INSERT'
    });

    // Policy for students to read their own assignments
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.assignments,
      policy_name: 'Students can read their own assignments',
      definition: `auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()`,
      policy_type: 'SELECT'
    });

    // Policy for admins to read all assignments
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.assignments,
      policy_name: 'Admins can read all assignments',
      definition: `auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin'`,
      policy_type: 'SELECT'
    });

  } catch (error) {
    console.log('Storage policies may already exist or need to be set up manually:', error);
  }
};

const setupRecordingsPolicies = async () => {
  try {
    // Policy for admins to upload recordings
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.recordings,
      policy_name: 'Admins can upload recordings',
      definition: `auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin'`,
      policy_type: 'INSERT'
    });

    // Policy for admins to update recordings
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.recordings,
      policy_name: 'Admins can update recordings',
      definition: `auth.role() = 'authenticated' AND auth.jwt()->>'role' = 'admin'`,
      policy_type: 'UPDATE'
    });

    // Policy for authenticated users to read recordings
    await supabase.rpc('create_storage_policy', {
      bucket_name: storageBuckets.recordings,
      policy_name: 'Authenticated users can read recordings',
      definition: `auth.role() = 'authenticated'`,
      policy_type: 'SELECT'
    });

  } catch (error) {
    console.log('Storage policies may already exist or need to be set up manually:', error);
  }
};

export const uploadFile = async (
  bucket: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ data: { publicUrl: string } | null; error: Error | null }> => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `${bucket}/${fileName}`;

    // For better UX, we'll simulate progress since Supabase doesn't provide progress tracking
    if (onProgress) {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        onProgress(Math.round(progress));
      }, 200);

      // Clear interval after upload completes
      setTimeout(() => {
        clearInterval(progressInterval);
        onProgress(100);
      }, 2000);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { data: { publicUrl }, error: null };

  } catch (error) {
    return { data: null, error: error as Error };
  }
};

export const deleteFile = async (bucket: string, fileUrl: string): Promise<{ error: Error | null }> => {
  try {
    // Extract file path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    return { error: error as Error | null };

  } catch (error) {
    return { error: error as Error };
  }
};