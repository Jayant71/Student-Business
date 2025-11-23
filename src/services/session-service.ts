import { supabase } from '../lib/supabase';
import { Session } from '../../types';

export interface ListSessionsOptions {
  limit?: number;
  status?: Session['status'];
  fromDate?: string;
}

export interface CreateSessionInput {
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  meeting_link?: string;
  status?: Session['status'];
  created_by: string;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  session_date?: string;
  start_time?: string;
  meeting_link?: string;
  status?: Session['status'];
}

const mapSession = (payload: any): Session => ({
  id: payload.id,
  title: payload.title,
  description: payload.description,
  session_date: payload.session_date,
  start_time: payload.start_time,
  meeting_link: payload.meeting_link,
  status: payload.status,
  created_by: payload.created_by,
  created_at: payload.created_at
});

export class SessionService {
  async list(options: ListSessionsOptions = {}): Promise<Session[]> {
    const { limit = 30, status, fromDate } = options;

    let query = supabase
      .from('sessions')
      .select('*')
      .order('session_date', { ascending: true })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDate) {
      query = query.gte('session_date', fromDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []).map(mapSession);
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const payload = {
      title: input.title,
      description: input.description,
      session_date: input.session_date,
      start_time: input.start_time,
      meeting_link: input.meeting_link,
      status: input.status ?? 'upcoming',
      created_by: input.created_by
    };

    const { data, error } = await supabase
      .from('sessions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapSession(data);
  }

  async update(sessionId: string, updates: UpdateSessionInput): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapSession(data);
  }

  async setStatus(sessionId: string, status: Session['status']): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapSession(data);
  }
}

export const sessionService = new SessionService();
