import { apiClient, ApiResponse } from './api-client';

export interface WhatsAppMessage {
  to_number: string;
  template: string;
  params?: string[];
  media?: {
    type?: 'image' | 'document' | 'video';
    url?: string;
    filename?: string;
  };
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  template: string;
  contacts_count: number;
  sent_count: number;
  read_count: number;
  reply_count: number;
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_at: string;
  scheduled_at?: string;
}

export interface WhatsAppCampaignRequest {
  name: string;
  template: string;
  contacts: Array<{
    phone_number: string;
    name?: string;
    custom_params?: Record<string, any>;
  }>;
  scheduled_at?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER';
    text: string;
    format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  }>;
}

export interface WhatsAppStats {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  read_rate: number;
  reply_rate: number;
}

export class WhatsAppService {
  private readonly basePath = '/automation';

  async sendMessage(request: WhatsAppMessage): Promise<ApiResponse<{ status: string; message_id?: string }>> {
    return apiClient.post(`${this.basePath}/trigger/whatsapp`, request);
  }

  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<ApiResponse<{ 
    status: string; 
    sent_count: number; 
    failed_count: number;
    message_ids: string[];
  }>> {
    return apiClient.post(`${this.basePath}/trigger/whatsapp/bulk`, { messages });
  }

  async createCampaign(request: WhatsAppCampaignRequest): Promise<ApiResponse<WhatsAppCampaign>> {
    return apiClient.post(`${this.basePath}/whatsapp/campaigns`, request);
  }

  async getCampaigns(): Promise<ApiResponse<WhatsAppCampaign[]>> {
    return apiClient.get(`${this.basePath}/whatsapp/campaigns`);
  }

  async getCampaign(id: string): Promise<ApiResponse<WhatsAppCampaign>> {
    return apiClient.get(`${this.basePath}/whatsapp/campaigns/${id}`);
  }

  async updateCampaign(id: string, updates: Partial<WhatsAppCampaignRequest>): Promise<ApiResponse<WhatsAppCampaign>> {
    return apiClient.put(`${this.basePath}/whatsapp/campaigns/${id}`, updates);
  }

  async deleteCampaign(id: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.delete(`${this.basePath}/whatsapp/campaigns/${id}`);
  }

  async pauseCampaign(id: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.post(`${this.basePath}/whatsapp/campaigns/${id}/pause`);
  }

  async resumeCampaign(id: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.post(`${this.basePath}/whatsapp/campaigns/${id}/resume`);
  }

  async getTemplates(): Promise<ApiResponse<WhatsAppTemplate[]>> {
    return apiClient.get(`${this.basePath}/whatsapp/templates`);
  }

  async getStats(): Promise<ApiResponse<WhatsAppStats>> {
    return apiClient.get(`${this.basePath}/whatsapp/stats`);
  }
}

export const whatsappService = new WhatsAppService();