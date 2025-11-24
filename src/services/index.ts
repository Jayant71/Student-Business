// Core services
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

// CRM and utility services
import { realtimeCRM } from './realtime-crm';
import { messageCache } from './message-cache';
import { errorLogger, logError, logApiError, logNetworkError } from './error-logger';
import { apiClient } from './api-client';

// Create instances of mock services
const mockEmailService = new MockEmailService();
const mockWhatsAppService = new MockWhatsAppService();
const mockPaymentService = new MockPaymentService();

// Determine which services to use
const useMocks = getServiceMode();

// Export the appropriate services with proper typing
export const emailService = useMocks ? mockEmailService : realEmailService;
export const whatsappService = useMocks ? mockWhatsAppService : realWhatsAppService;
export const paymentService = useMocks ? mockPaymentService : realPaymentService;
export const sessionService = realSessionService;

// Export API client
export { apiClient };

// Export CRM services
export { realtimeCRM, messageCache };

// Export utility services
export { errorLogger, logError, logApiError, logNetworkError };

// Export types from core services
export type * from './email-service';
export type * from './whatsapp-service';
export type * from './payment-service';
export type * from './session-service';

// Export types from services that don't conflict
export type { SessionOption as AssignmentSessionOption } from './assignment-service';
export type { SessionOption as RecordingSessionOption } from './recording-service';

export type * from './api-client';

// Export CRM types
export type * from './realtime-crm';
export type * from './message-cache';

// Export error logger types
export type * from './error-logger';

// Export mock services for testing
export { MockEmailService, MockWhatsAppService, MockPaymentService };
export { getServiceMode } from './mock-services';

// Export additional services that exist
export * from './cta-service';
export * from './recording-view-service';

// Service factory for creating instances with custom configuration
export class ServiceFactory {
  static createEmailService(useMock?: boolean) {
    return useMock ?? getServiceMode() ? new MockEmailService() : realEmailService;
  }

  static createWhatsAppService(useMock?: boolean) {
    return useMock ?? getServiceMode() ? new MockWhatsAppService() : realWhatsAppService;
  }

  static createPaymentService(useMock?: boolean) {
    return useMock ?? getServiceMode() ? new MockPaymentService() : realPaymentService;
  }

  static createRealtimeCRM() {
    return realtimeCRM;
  }

  static createMessageCache() {
    return messageCache;
  }

  static createErrorLogger() {
    return errorLogger;
  }

  static createApiClient() {
    return apiClient;
  }
}

// Default export containing all services
export default {
  emailService,
  whatsappService,
  paymentService,
  sessionService,
  apiClient,
  realtimeCRM,
  messageCache,
  errorLogger,
  ServiceFactory,
  MockEmailService,
  MockWhatsAppService,
  MockPaymentService
};