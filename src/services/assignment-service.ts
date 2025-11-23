import { supabase } from '../lib/supabase';
import {
  Assignment,
  AssignmentSubmission,
  AssignmentWithSession,
  Session,
  StudentAssignmentView
} from '../../types';

export interface AssignmentListOptions {
  limit?: number;
  sessionId?: string;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  session_id?: string | null;
  due_date?: string | null;
  file_url?: string | null;
  admin_id: string;
}

export interface SubmitAssignmentInput {
  assignment_id: string;
  user_id: string;
  file_url: string;
}

export interface SessionOption extends Pick<Session, 'id' | 'title' | 'session_date' | 'start_time' | 'status'> {}

const mapSession = (session: any): Session | undefined => {
  if (!session) {
    return undefined;
  }

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    session_date: session.session_date,
    start_time: session.start_time,
    meeting_link: session.meeting_link,
    status: session.status,
    created_by: session.created_by,
    created_at: session.created_at
  };
};

const mapAssignment = (payload: any): AssignmentWithSession => {
  const assignment: Assignment = {
    id: payload.id,
    admin_id: payload.admin_id,
    session_id: payload.session_id,
    title: payload.title,
    description: payload.description,
    file_url: payload.file_url,
    due_date: payload.due_date,
    created_at: payload.created_at
  };

  const submissions = Array.isArray(payload.assignment_submissions)
    ? payload.assignment_submissions
    : [];

  const lastSubmission = submissions.reduce((latest: string | null, submission: any) => {
    if (!submission?.submitted_at) {
      return latest;
    }
    if (!latest) {
      return submission.submitted_at;
    }
    return submission.submitted_at > latest ? submission.submitted_at : latest;
  }, null);

  return {
    ...assignment,
    session: mapSession(payload.sessions),
    submission_count: submissions.length,
    last_submission_at: lastSubmission
  };
};

export class AssignmentService {
  async listForAdmin(options: AssignmentListOptions = {}): Promise<AssignmentWithSession[]> {
    const { limit = 30, sessionId } = options;

    let query = supabase
      .from('assignments')
      .select(`
        *,
        sessions(*),
        assignment_submissions(id, submitted_at, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []).map(mapAssignment);
  }

  async create(input: CreateAssignmentInput): Promise<AssignmentWithSession> {
    const payload = {
      admin_id: input.admin_id,
      session_id: input.session_id || null,
      title: input.title,
      description: input.description,
      file_url: input.file_url,
      due_date: input.due_date ? new Date(input.due_date).toISOString() : null
    };

    const { data, error } = await supabase
      .from('assignments')
      .insert(payload)
      .select(`
        *,
        sessions(*),
        assignment_submissions(id, submitted_at, status)
      `)
      .single();

    if (error) {
      throw error;
    }

    return mapAssignment(data);
  }

  async submit(input: SubmitAssignmentInput): Promise<AssignmentSubmission> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .upsert(
        {
          assignment_id: input.assignment_id,
          user_id: input.user_id,
          file_url: input.file_url,
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        },
        { onConflict: 'assignment_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as AssignmentSubmission;
  }

  async listForStudent(userId: string, limit: number = 25): Promise<StudentAssignmentView[]> {
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        sessions(*),
        assignment_submissions(id)
      `)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('user_id', userId);

    if (submissionsError) {
      throw submissionsError;
    }

    const submissionMap = new Map<string, AssignmentSubmission>();
    (submissions || []).forEach((submission) => {
      submissionMap.set(submission.assignment_id, submission);
    });

    return (assignments || []).map((assignment) => {
      const submission = submissionMap.get(assignment.id);
      const base = mapAssignment(assignment);

      return {
        ...base,
        status: submission ? (submission.status === 'graded' ? 'graded' : 'submitted') : 'pending',
        submission_url: submission?.file_url || null,
        grade: submission?.grade || null,
        feedback: submission?.feedback || null,
        submitted_at: submission?.submitted_at || null
      };
    });
  }

  async fetchSessionOptions(limit: number = 25): Promise<SessionOption[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, session_date, start_time, status')
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }
}

export const assignmentService = new AssignmentService();
