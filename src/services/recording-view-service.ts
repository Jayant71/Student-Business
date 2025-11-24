import { supabase } from '../lib/supabase';

/**
 * Service for tracking recording views
 */
export const recordingViewService = {
  /**
   * Log a recording view
   * Uses upsert to handle the unique constraint (one view per user per recording)
   */
  async logView(recordingId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('recording_views')
      .upsert(
        {
          recording_id: recordingId,
          user_id: userId,
          viewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'recording_id,user_id',
        }
      );

    if (error) {
      console.error('Failed to log recording view:', error);
      throw error;
    }
  },

  /**
   * Update watch duration for a recording view
   */
  async updateWatchDuration(
    recordingId: string,
    userId: string,
    durationSeconds: number
  ): Promise<void> {
    const { error } = await supabase
      .from('recording_views')
      .update({ watch_duration: durationSeconds })
      .eq('recording_id', recordingId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update watch duration:', error);
      throw error;
    }
  },

  /**
   * Get recording views for a specific user
   */
  async getUserViews(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('recording_views')
      .select('*')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user views:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Check if a user has viewed a specific recording
   */
  async hasViewed(recordingId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('recording_views')
      .select('id')
      .eq('recording_id', recordingId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Failed to check view status:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Get view count for a recording (admin only)
   */
  async getViewCount(recordingId: string): Promise<number> {
    const { count, error } = await supabase
      .from('recording_views')
      .select('*', { count: 'exact', head: true })
      .eq('recording_id', recordingId);

    if (error) {
      console.error('Failed to get view count:', error);
      throw error;
    }

    return count || 0;
  },
};
