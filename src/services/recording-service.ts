import { supabase } from '../lib/supabase';
import { Recording, RecordingWithSession, Session } from '../../types';

export interface ListRecordingsOptions {
  includeHidden?: boolean;
  limit?: number;
}

export interface CreateRecordingInput {
  session_id: string;
  video_url: string;
  visible_to_students?: boolean;
  title?: string;
  duration?: string;
}

export interface SessionOption extends Pick<Session, 'id' | 'title' | 'session_date' | 'start_time' | 'status'> {}

const mapRecording = (payload: any): RecordingWithSession => {
  return {
    id: payload.id,
    session_id: payload.session_id,
    video_url: payload.video_url,
    visible_to_students: payload.visible_to_students,
    uploaded_at: payload.uploaded_at,
    title: payload.title,
    duration: payload.duration,
    session: payload.sessions ? {
      id: payload.sessions.id,
      title: payload.sessions.title,
      description: payload.sessions.description,
      session_date: payload.sessions.session_date,
      start_time: payload.sessions.start_time,
      meeting_link: payload.sessions.meeting_link,
      status: payload.sessions.status,
      created_by: payload.sessions.created_by,
      created_at: payload.sessions.created_at
    } : undefined
  };
};

export class RecordingService {
  async list(options: ListRecordingsOptions = {}): Promise<RecordingWithSession[]> {
    const { includeHidden = true, limit = 30 } = options;
    let query = supabase
      .from('recordings')
      .select('*, sessions(*)')
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (!includeHidden) {
      query = query.eq('visible_to_students', true);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []).map(mapRecording);
  }

  async create(input: CreateRecordingInput): Promise<RecordingWithSession> {
    const { data, error } = await supabase
      .from('recordings')
      .insert({
        session_id: input.session_id,
        video_url: input.video_url,
        visible_to_students: input.visible_to_students ?? true,
        title: input.title,
        duration: input.duration
      })
      .select('*, sessions(*)')
      .single();

    if (error) {
      throw error;
    }

    return mapRecording(data);
  }

  async toggleVisibility(recordingId: string, visible: boolean): Promise<void> {
    const { error } = await supabase
      .from('recordings')
      .update({ visible_to_students: visible })
      .eq('id', recordingId);

    if (error) {
      throw error;
    }
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

export const recordingService = new RecordingService();
