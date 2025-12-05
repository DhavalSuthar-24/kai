import { createLogger } from '@shared/index.ts';
import { pushQueue } from '../workers/push-worker.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('doomscroll-consumer');

interface DoomscrollEvent {
  type: 'DOOMSCROLL_DETECTED';
  data: {
    userId: string;
    appName: string;
    userName?: string;
    email: string;
  };
}

export const handleDoomscroll = async (message: DoomscrollEvent) => {
  try {
    const { type, data } = message;

    if (type === 'DOOMSCROLL_DETECTED') {
      logger.info('Processing DOOMSCROLL_DETECTED event', {
        userId: data.userId,
        appName: data.appName,
      });

      // Send push notification immediately
      await pushQueue.add('doomscroll-intervention', {
        userId: data.userId,
        title: '⚠️ Take a break!',
        body: `You've been scrolling on ${data.appName} for a while. Time for something productive?`,
        type: NotificationType.DOOMSCROLL_INTERVENTION,
        data: {
          type: 'DOOMSCROLL_INTERVENTION',
          appName: data.appName,
        },
      });

      // Also send email
      const template = EMAIL_TEMPLATES.DOOMSCROLL_INTERVENTION;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const variables = {
        userName: data.userName || 'there',
        appName: data.appName,
        actionUrl: `${appUrl}/review`,
        unsubscribeUrl: `${appUrl}/unsubscribe/${data.userId}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('doomscroll-intervention-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.DOOMSCROLL_INTERVENTION,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued doomscroll intervention notifications', { userId: data.userId });
    }
  } catch (error) {
    logger.error('Error handling doomscroll event', error);
  }
};
