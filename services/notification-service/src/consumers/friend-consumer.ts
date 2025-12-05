import { createLogger } from '@shared/index.ts';
import { pushQueue } from '../workers/push-worker.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('friend-consumer');

interface FriendEvent {
  type: 'FRIEND_CHALLENGE';
  data: {
    userId: string;
    friendName: string;
    friendId: string;
    challengeId: string;
    challengeDescription: string;
    challengeGoal: string;
    userName?: string;
    email: string;
  };
}

export const handleFriendEvents = async (message: FriendEvent) => {
  try {
    const { type, data } = message;

    if (type === 'FRIEND_CHALLENGE') {
      logger.info('Processing FRIEND_CHALLENGE event', {
        userId: data.userId,
        friendName: data.friendName,
      });

      // Send push notification
      await pushQueue.add('friend-challenge', {
        userId: data.userId,
        title: `🏆 ${data.friendName} challenged you!`,
        body: data.challengeDescription,
        type: NotificationType.FRIEND_CHALLENGE,
        data: {
          type: 'FRIEND_CHALLENGE',
          friendId: data.friendId,
          challengeId: data.challengeId,
        },
      });

      // Also send email
      const template = EMAIL_TEMPLATES.FRIEND_CHALLENGE;
      const variables = {
        userName: data.userName || 'there',
        friendName: data.friendName,
        challengeDescription: data.challengeDescription,
        challengeGoal: data.challengeGoal,
        challengeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/challenges/${data.challengeId}`,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${data.userId}`,
      };

      const htmlBody = TemplateRenderer.render(template.body, variables);
      const subject = TemplateRenderer.render(template.subject, variables);

      await emailQueue.add('friend-challenge-email', {
        userId: data.userId,
        to: data.email,
        subject,
        body: htmlBody,
        type: NotificationType.FRIEND_CHALLENGE,
        variables,
        unsubscribeUrl: variables.unsubscribeUrl,
      });

      logger.info('Queued friend challenge notifications', { userId: data.userId });
    }
  } catch (error) {
    logger.error('Error handling friend event', error);
  }
};
