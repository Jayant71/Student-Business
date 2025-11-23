import React from 'react';

export interface NavItem {
  label: string;
  href: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  age: number;
  content: string;
  image: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
}

export type AdminView = 
  | 'dashboard' 
  | 'import' 
  | 'email' 
  | 'cta' 
  | 'whatsapp' 
  | 'calling' 
  | 'crm' 
  | 'payments' 
  | 'paid-users' 
  | 'schedule' 
  | 'assignments' 
  | 'recordings' 
  | 'notifications' 
  | 'support' 
  | 'certificates' 
  | 'settings';

export type StudentView =
  | 'dashboard'
  | 'schedule'
  | 'recordings'
  | 'assignments'
  | 'payments'
  | 'support'
  | 'profile';

// Database entity types
export interface CTASubmission {
  id: string;
  name: string;
  age?: number;
  email: string;
  phone: string;
  message?: string;
  preferred_time_slot?: string | null;
  source?: string | null;
  status: 'new' | 'approved' | 'rejected';
  submission_date: string;
}

export interface ImportedLead {
  id: string;
  admin_id: string;
  name?: string;
  email?: string;
  phone?: string;
  source: string;
  status: 'pending' | 'emailed' | 'error';
  uploaded_at: string;
}

export interface Payment {
  id: string;
  user_id?: string;
  payment_request_id?: string;
  payment_id?: string;
  amount?: number;
  status: 'pending' | 'paid' | 'failed';
  payment_url?: string;
  paid_at?: string;
  webhook_payload?: any;
  created_at: string;
}

export interface CRMMessage {
  id: string;
  admin_id?: string;
  user_id?: string;
  channel: 'email' | 'whatsapp' | 'call';
  sender: 'admin' | 'user';
  message: string;
  meta?: any;
  timestamp: string;
  delivery_status?: MessageDeliveryStatus;
  read_at?: string;
  delivered_at?: string;
  external_message_id?: string;
}

export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface TypingIndicator {
  user_id: string;
  contact_id: string;
  is_typing: boolean;
  channel: 'email' | 'whatsapp';
  timestamp: string;
  last_seen?: string;
}

export interface MessageCache {
  messages: CRMMessage[];
  last_sync: string;
  contact_id: string;
  pending_messages: PendingMessage[];
}

export interface PendingMessage {
  temp_id: string;
  contact_id: string;
  channel: 'email' | 'whatsapp';
  message: string;
  timestamp: string;
  retry_count: number;
  status: 'pending' | 'failed';
}

export interface RealtimeEvent {
  type: 'message' | 'typing' | 'delivery_status' | 'read_receipt';
  payload: any;
  timestamp: string;
}

export interface MessageSyncStatus {
  last_sync: string;
  pending_count: number;
  failed_count: number;
  is_online: boolean;
}

export interface Profile {
  id: string;
  role: 'admin' | 'student';
  email: string;
  phone?: string;
  name?: string;
  parent_name?: string;
  parent_contact?: string;
  created_at: string;
}

// File upload related types
export interface FileUploadOptions {
  bucket: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  onProgress?: (progress: number) => void;
  onSuccess?: (fileUrl: string) => void;
  onError?: (error: string) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_url: string;
  submitted_at: string;
  status: 'submitted' | 'graded';
  grade?: string;
  feedback?: string | null;
}

export interface Recording {
  id: string;
  session_id: string;
  video_url: string;
  visible_to_students: boolean;
  uploaded_at: string;
  title?: string | null;
  duration?: string | null;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  meeting_link?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  created_by?: string;
  created_at: string;
}

export interface RecordingWithSession extends Recording {
  session?: Session;
}

export interface Assignment {
  id: string;
  admin_id: string;
  session_id?: string | null;
  title: string;
  description?: string | null;
  file_url?: string | null;
  due_date?: string | null;
  created_at: string;
}

export interface AssignmentWithSession extends Assignment {
  session?: Session;
  submission_count?: number;
  last_submission_at?: string | null;
}

export interface StudentAssignmentView extends AssignmentWithSession {
  status: 'pending' | 'submitted' | 'graded';
  submission_url?: string | null;
  grade?: string | null;
  feedback?: string | null;
  submitted_at?: string | null;
}