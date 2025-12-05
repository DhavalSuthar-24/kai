import { createLogger } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('verification-consumer');

interface VerificationEvent {
  type: 'EMAIL_VERIFICATION_REQUESTED';
  data: {
    userId: string;
    email: string;
    token: string;
    name?: string;
  };
}

export const handleVerificationRequest = async (message: VerificationEvent) => {
  try {
    const { type, data } = message;

    if (type === 'EMAIL_VERIFICATION_REQUESTED') {
      logger.info('Processing EMAIL_VERIFICATION_REQUESTED event', { userId: data.userId });

      const template = EMAIL_TEMPLATES.VERIFICATION_EMAIL;
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${data.token}`;
      
      const variables = {
        userName: data.name || 'there',
        verificationUrl,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('verification-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.VERIFICATION_EMAIL,
        variables,
      });

      logger.info('Queued verification email', { userId: data.userId, email: data.email });
    }
  } catch (error) {
    logger.error('Error handling verification event', error);
  }
};
