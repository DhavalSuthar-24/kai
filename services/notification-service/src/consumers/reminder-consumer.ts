import { createLogger } from '@shared/index.ts';
import { pushQueue } from '../workers/push-worker.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('reminder-consumer');

export const handleReminders = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'FLASHCARD_DUE') {
      logger.info('Processing FLASHCARD_DUE event', { userId: data.userId, count: data.count });

      // Send push notification
      await pushQueue.add('flashcard-due', {
        userId: data.userId,
        title: 'Time to Review!',
        body: `You have ${data.count} flashcard${data.count > 1 ? 's' : ''} due for review.`,
        type: NotificationType.FLASHCARD_DUE,
        data: {
          type: 'FLASHCARD_DUE',
          count: String(data.count),
        },
      });

                                    // Also send email
      const template = EMAIL_TEMPLATES.FLASHCARD_DUE;
      const variables = {
        userName: data.userName || 'there',
        flashcardCount: data.count,
        reviewUrl: `${process.env.APP_URL || 'http://localhost:3000'}/review`,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${data.userId}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('flashcard-due-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.FLASHCARD_DUE,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued flashcard due notifications', { userId: data.userId });

    } else if (type === 'STREAK_WARNING') {
      logger.info('Processing STREAK_WARNING event', { userId: data.userId, streak: data.streak });

      // Send push notification
      await pushQueue.add('streak-warning', {
        userId: data.userId,
        title: 'Don\'t lose your streak!',
        body: `You haven't studied today. Complete a lesson to keep your ${data.streak}-day streak alive!`,
        type: NotificationType.STREAK_WARNING,
        data: {
          type: 'STREAK_WARNING',
          streak: String(data.streak),
        },
      });

      // Also send email
      const template = EMAIL_TEMPLATES.STREAK_WARNING;
      const variables = {
        userName: data.userName || 'there',
        streak: data.streak,
        reviewUrl: `${process.env.APP_URL || 'http://localhost:3000'}/review`,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${data.userId}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('streak-warning-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.STREAK_WARNING,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued streak warning notifications', { userId: data.userId });
    }
  } catch (error) {
    logger.error('Error handling reminder event', error);
  }
};
