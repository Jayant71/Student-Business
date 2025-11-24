import { supabase } from '../lib/supabase';
import { CTASubmission } from '../../types';

export interface CTAFilters {
  status?: 'new' | 'approved' | 'rejected';
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const ctaService = {
  /**
   * Fetch CTA submissions with filters and pagination
   */
  async list(filters: CTAFilters = {}): Promise<{ data: CTASubmission[]; count: number }> {
    const { status, searchTerm, limit = 20, offset = 0 } = filters;

    let query = supabase
      .from('cta_submissions')
      .select('*', { count: 'exact' })
      .order('submission_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (searchTerm && searchTerm.trim()) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data || [], count: count || 0 };
  },

  /**
   * Approve a CTA submission
   */
  async approve(id: string, notes?: string): Promise<CTASubmission> {
    const { data, error } = await supabase
      .from('cta_submissions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // TODO: Trigger automation workflow when external APIs are ready
    // This will send welcome email, WhatsApp, and voice call

    return data;
  },

  /**
   * Reject a CTA submission
   */
  async reject(id: string, reason?: string): Promise<CTASubmission> {
    const { data, error } = await supabase
      .from('cta_submissions')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Batch approve multiple submissions
   */
  async batchApprove(ids: string[]): Promise<number> {
    const { data, error } = await supabase
      .from('cta_submissions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) throw error;

    return data?.length || 0;
  },

  /**
   * Get statistics
   */
  async getStats(): Promise<{ new: number; approved: number; rejected: number; total: number }> {
    const { data: allData, error: allError } = await supabase
      .from('cta_submissions')
      .select('status');

    if (allError) throw allError;

    const stats = {
      new: allData?.filter(s => s.status === 'new').length || 0,
      approved: allData?.filter(s => s.status === 'approved').length || 0,
      rejected: allData?.filter(s => s.status === 'rejected').length || 0,
      total: allData?.length || 0
    };

    return stats;
  }
};
