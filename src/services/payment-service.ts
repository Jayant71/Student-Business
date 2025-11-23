import { apiClient, ApiResponse } from './api-client';

export interface PaymentLinkRequest {
  amount: number;
  purpose: string;
  buyer_name: string;
  email: string;
  phone: string;
  redirect_url?: string;
  webhook?: string;
  allow_repeated_payments?: boolean;
}

export interface PaymentLink {
  id: string;
  longurl: string;
  shorturl?: string;
  amount: number;
  purpose: string;
  buyer_name: string;
  email: string;
  phone: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  created_at: string;
  expires_at?: string;
  payments_required?: boolean;
}

export interface Payment {
  id: string;
  payment_request_id: string;
  status: 'Credit' | 'Failed' | 'Refunded';
  amount: number;
  fees: number;
  currency: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  payment_id: string;
}

export interface PaymentStats {
  total_links: number;
  total_paid: number;
  total_pending: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  conversion_rate: number;
}

export class PaymentService {
  private readonly basePath = '/admin';

  async createPaymentLink(request: PaymentLinkRequest): Promise<ApiResponse<PaymentLink>> {
    return apiClient.post(`${this.basePath}/payment-links`, request);
  }

  async getPaymentLinks(): Promise<ApiResponse<PaymentLink[]>> {
    return apiClient.get(`${this.basePath}/payment-links`);
  }

  async getPaymentLink(id: string): Promise<ApiResponse<PaymentLink>> {
    return apiClient.get(`${this.basePath}/payment-links/${id}`);
  }

  async updatePaymentLink(id: string, updates: Partial<PaymentLinkRequest>): Promise<ApiResponse<PaymentLink>> {
    return apiClient.put(`${this.basePath}/payment-links/${id}`, updates);
  }

  async deletePaymentLink(id: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.delete(`${this.basePath}/payment-links/${id}`);
  }

  async resendPaymentLink(id: string): Promise<ApiResponse<{ status: string; sent: boolean }>> {
    return apiClient.post(`${this.basePath}/payment-links/${id}/resend`);
  }

  async getPayments(linkId?: string): Promise<ApiResponse<Payment[]>> {
    const url = linkId ? `${this.basePath}/payments?link_id=${linkId}` : `${this.basePath}/payments`;
    return apiClient.get(url);
  }

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return apiClient.get(`${this.basePath}/payments/${id}`);
  }

  async refundPayment(id: string, amount?: number): Promise<ApiResponse<{ status: string; refund_id: string }>> {
    return apiClient.post(`${this.basePath}/payments/${id}/refund`, { amount });
  }

  async getStats(): Promise<ApiResponse<PaymentStats>> {
    return apiClient.get(`${this.basePath}/payment-stats`);
  }

  async exportPayments(startDate?: string, endDate?: string): Promise<ApiResponse<{ download_url: string }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const url = `${this.basePath}/payments/export${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url);
  }
}

export const paymentService = new PaymentService();