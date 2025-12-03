import { createLogger } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('user-created-consumer');

export const handleUserCreated = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'USER_CREATED') {
      logger.info('Processing USER_CREATED event', { userId: data.id });

      const template = EMAIL_TEMPLATES.WELCOME_EMAIL;
      const variables = {
        userName: data.name || 'there',
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${data.id}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('welcome-email', {
        userId: data.id,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.WELCOME_EMAIL,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued welcome email', { userId: data.id, email: data.email });
    }
  } catch (error) {
    logger.error('Error handling user event', error);
  }
};
