import { createLogger } from '@shared/index.ts';

const logger = createLogger('sms-service');

export class SmsService {
  /**
   * Send SMS to a phone number
   * @param to Phone number
   * @param body Message body
   */
  async sendSms(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Mock implementation since we don't have a real SMS provider key
    logger.info(`MOCK: Sending SMS to ${to}: ${body}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`
    };
  }
}
