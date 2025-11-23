import { EmailRequest, EmailBatchRequest, EmailTemplate, EmailStats } from './email-service';
import { WhatsAppMessage, WhatsAppCampaign, WhatsAppCampaignRequest, WhatsAppTemplate, WhatsAppStats } from './whatsapp-service';
import { PaymentLinkRequest, PaymentLink, Payment, PaymentStats } from './payment-service';

// Mock data generators
const generateMockEmail = (): EmailTemplate => ({
  id: Math.random().toString(36).substr(2, 9),
  name: ['Welcome Email', 'Payment Reminder', 'Class Link', 'Follow Up'][Math.floor(Math.random() * 4)],
  subject: 'Welcome to Future Founders! 🚀',
  content: 'Hi {{name}},\n\nWe are thrilled to have you interested in the No-Code Future Academy.',
  variables: ['name', 'email', 'course']
});

const generateMockPaymentLink = (index: number): PaymentLink => ({
  id: `payment_${index}`,
  longurl: `https://test.instamojo.com/payment_${index}`,
  amount: 199.00,
  purpose: 'Course Enrollment',
  buyer_name: `Student Name ${index}`,
  email: `student${index}@email.com`,
  phone: `+123456789${index}`,
  status: Math.random() > 0.7 ? 'Paid' : 'Pending',
  created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
});

const generateMockCampaign = (index: number): WhatsAppCampaign => ({
  id: `campaign_${index}`,
  name: `Welcome Sequence - Batch ${index}`,
  template: 'welcome_template',
  contacts_count: 45 + Math.floor(Math.random() * 20),
  sent_count: 40 + Math.floor(Math.random() * 20),
  read_count: 35 + Math.floor(Math.random() * 15),
  reply_count: 5 + Math.floor(Math.random() * 10),
  status: ['active', 'completed', 'paused'][Math.floor(Math.random() * 3)] as any,
  created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
});

// Mock Email Service
export class MockEmailService {
  async sendEmail(request: EmailRequest) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    const success = Math.random() > 0.1;
    return {
      data: { 
        status: success ? 'success' : 'failed',
        message: success ? 'Email sent successfully' : 'Failed to send email'
      },
      status: success ? 200 : 500
    };
  }

  async sendBatchEmail(request: EmailBatchRequest) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const sentCount = Math.floor(request.emails.length * (0.8 + Math.random() * 0.2));
    return {
      data: {
        status: 'completed',
        sent_count: sentCount,
        failed_count: request.emails.length - sentCount
      },
      status: 200
    };
  }

  async getTemplates() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: Array.from({ length: 5 }, () => generateMockEmail()),
      status: 200
    };
  }

  async getStats() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      data: {
        total_sent: 1250,
        total_failed: 25,
        delivery_rate: 98.0,
        last_sent: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      status: 200
    };
  }

  async saveTemplate(template: Omit<EmailTemplate, 'id'>) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      data: { ...template, id: Math.random().toString(36).substr(2, 9) },
      status: 201
    };
  }
}

// Mock WhatsApp Service
export class MockWhatsAppService {
  async sendMessage(request: WhatsAppMessage) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    const success = Math.random() > 0.05;
    return {
      data: { 
        status: success ? 'success' : 'failed',
        message_id: success ? `msg_${Math.random().toString(36).substr(2, 9)}` : undefined
      },
      status: success ? 200 : 500
    };
  }

  async sendBulkMessages(messages: WhatsAppMessage[]) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const sentCount = Math.floor(messages.length * (0.9 + Math.random() * 0.1));
    return {
      data: {
        status: 'completed',
        sent_count: sentCount,
        failed_count: messages.length - sentCount,
        message_ids: Array.from({ length: sentCount }, () => Math.random().toString(36).substr(2, 9))
      },
      status: 200
    };
  }

  async createCampaign(request: WhatsAppCampaignRequest) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      data: {
        ...generateMockCampaign(1),
        name: request.name,
        contacts_count: request.contacts.length
      },
      status: 201
    };
  }

  async getCampaigns() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: Array.from({ length: 3 }, (_, i) => generateMockCampaign(i + 1)),
      status: 200
    };
  }

  async getTemplates() {
    await new Promise(resolve => setTimeout(resolve, 250));
    return {
      data: [
        {
          id: 'welcome_template',
          name: 'Welcome Message',
          category: 'MARKETING',
          language: 'en',
          components: [
            { type: 'BODY' as const, text: 'Hi {{name}}, welcome to Future Founders!' }
          ]
        }
      ],
      status: 200
    };
  }

  async getStats() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      data: {
        total_sent: 890,
        total_delivered: 875,
        total_read: 805,
        total_replied: 125,
        read_rate: 92.0,
        reply_rate: 14.3
      },
      status: 200
    };
  }
}

// Mock Payment Service
export class MockPaymentService {
  async createPaymentLink(request: PaymentLinkRequest) {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
    const id = Math.random().toString(36).substr(2, 9);
    return {
      data: {
        id,
        longurl: `https://test.instamojo.com/${id}`,
        amount: request.amount,
        purpose: request.purpose,
        buyer_name: request.buyer_name,
        email: request.email,
        phone: request.phone,
        status: 'Pending' as const,
        created_at: new Date().toISOString()
      },
      status: 201
    };
  }

  async getPaymentLinks() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      data: Array.from({ length: 5 }, (_, i) => generateMockPaymentLink(i + 1)),
      status: 200
    };
  }

  async resendPaymentLink(id: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      data: { status: 'success', sent: true },
      status: 200
    };
  }

  async getStats() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      data: {
        total_links: 45,
        total_paid: 32,
        total_pending: 13,
        total_amount: 8910.00,
        paid_amount: 6368.00,
        pending_amount: 2542.00,
        conversion_rate: 71.1
      },
      status: 200
    };
  }
}

// Factory function to get either real or mock services
export const getServiceMode = () => {
  const isDevelopment = import.meta.env.DEV;
  const useMocks = import.meta.env.VITE_USE_MOCK_SERVICES === 'true';
  return isDevelopment && useMocks;
};