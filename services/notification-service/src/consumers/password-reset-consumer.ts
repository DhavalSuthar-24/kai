import { createLogger } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('password-reset-consumer');

interface PasswordResetEvent {
  type: 'PASSWORD_RESET_REQUESTED';
  data: {
    userId: string;
    email: string;
    token: string;
    name?: string;
  };
}

export const handlePasswordResetRequest = async (message: PasswordResetEvent) => {
  try {
    const { type, data } = message;

    if (type === 'PASSWORD_RESET_REQUESTED') {
      logger.info('Processing PASSWORD_RESET_REQUESTED event', { userId: data.userId });

      const template = EMAIL_TEMPLATES.PASSWORD_RESET;
      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${data.token}`;
      
      const variables = {
        userName: data.name || 'there',
        resetUrl,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('password-reset-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.PASSWORD_RESET,
        variables,
      });

      logger.info('Queued password reset email', { userId: data.userId, email: data.email });
    }
  } catch (error) {
    logger.error('Error handling password reset event', error);
  }
};
