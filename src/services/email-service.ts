import { apiClient, ApiResponse } from './api-client';

export interface EmailRequest {
  to_email: string;
  subject: string;
  content: string;
  template_name?: string;
  template_params?: Record<string, any>;
}

export interface EmailBatchRequest {
  emails: EmailRequest[];
  template_name?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface EmailStats {
  total_sent: number;
  total_failed: number;
  delivery_rate: number;
  last_sent: string;
}

export class EmailService {
  private readonly basePath = '/automation';

  async sendEmail(request: EmailRequest): Promise<ApiResponse<{ status: string; message?: string }>> {
    return apiClient.post(`${this.basePath}/trigger/email`, request);
  }

  async sendBatchEmail(request: EmailBatchRequest): Promise<ApiResponse<{ status: string; sent_count: number; failed_count: number }>> {
    return apiClient.post(`${this.basePath}/trigger/email/batch`, request);
  }

  async getTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    return apiClient.get(`${this.basePath}/email/templates`);
  }

  async getStats(): Promise<ApiResponse<EmailStats>> {
    return apiClient.get(`${this.basePath}/email/stats`);
  }

  async saveTemplate(template: Omit<EmailTemplate, 'id'>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.post(`${this.basePath}/email/templates`, template);
  }

  async updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
    return apiClient.put(`${this.basePath}/email/templates/${id}`, template);
  }

  async deleteTemplate(id: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.delete(`${this.basePath}/email/templates/${id}`);
  }
}

export const emailService = new EmailService();