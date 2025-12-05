import { createLogger } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('memory-consumer');

interface MemoryEvent {
  type: 'MEMORY_OF_DAY';
  data: {
    userId: string;
    userName?: string;
    email: string;
    memoryTitle: string;
    memoryDescription: string;
    memoryDate: string;
  };
}

export const handleMemory = async (message: MemoryEvent) => {
  try {
    const { type, data } = message;

    if (type === 'MEMORY_OF_DAY') {
      logger.info('Processing MEMORY_OF_DAY event', { userId: data.userId });

      const template = EMAIL_TEMPLATES.MEMORY_OF_DAY;
      const variables = {
        userName: data.userName || 'there',
        memoryTitle: data.memoryTitle,
        memoryDescription: data.memoryDescription,
        memoryDate: data.memoryDate,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${data.userId}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('memory-of-day', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.MEMORY_OF_DAY,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued memory of the day email', { userId: data.userId });
    }
  } catch (error) {
    logger.error('Error handling memory event', error);
  }
};
