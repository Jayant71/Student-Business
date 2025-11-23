// Real services
import { emailService as realEmailService } from './email-service';
import { whatsappService as realWhatsAppService } from './whatsapp-service';
import { paymentService as realPaymentService } from './payment-service';
import { sessionService as realSessionService } from './session-service';

// Mock services
import { 
  MockEmailService, 
  MockWhatsAppService, 
  MockPaymentService,
  getServiceMode 
} from './mock-services';

// Create instances of mock services
const mockEmailService = new MockEmailService();
const mockWhatsAppService = new MockWhatsAppService();
const mockPaymentService = new MockPaymentService();

// Determine which services to use
const useMocks = getServiceMode();

// Export the appropriate services
export const emailService = useMocks ? mockEmailService : realEmailService;
export const whatsappService = useMocks ? mockWhatsAppService : realWhatsAppService;
export const paymentService = useMocks ? mockPaymentService : realPaymentService;
export const sessionService = realSessionService;

// Export types
export * from './email-service';
export * from './whatsapp-service';
export * from './payment-service';
export * from './session-service';
export * from './assignment-service';
export * from './api-client';
export * from './recording-service';

// Export new CRM services
export * from './realtime-crm';
export * from './message-cache';

// Export mock services for testing
export { MockEmailService, MockWhatsAppService, MockPaymentService };