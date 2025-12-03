import { createLogger } from '@shared/index.ts';
import { pushQueue } from '../workers/push-worker.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';

const logger = createLogger('gamification-consumer');

export const handleGamificationEvents = async (message: any) => {
  try {
    const { type, userId, data } = message;
    logger.info(`Processing gamification event: ${type}`, { userId });

    if (type === 'LEVEL_UP') {
      // Push Notification
      await pushQueue.add('level-up', {
        userId,
        title: 'Level Up! 🎉',
        body: `Congratulations! You've reached Level ${data.level}. Keep up the great work!`,
        type: NotificationType.LEVEL_UP,
        data: {
          type: 'LEVEL_UP',
          level: String(data.level),
        },
      });

      // Email (Optional for every level, maybe only milestones? For now, send it)
      // We don't have a specific template for Level Up yet, let's use a generic one or skip email for now to avoid spam.
      // Actually, let's skip email for Level Up unless it's a major milestone (e.g. every 5 levels).
      // For simplicity in this task, I'll skip email for Level Up to avoid cluttering templates.
      
    } else if (type === 'ACHIEVEMENT_UNLOCKED') {
      // Push Notification
      await pushQueue.add('achievement-unlocked', {
        userId,
        title: 'Achievement Unlocked! 🏆',
        body: `You've unlocked: ${data.name}`,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        data: {
          type: 'ACHIEVEMENT_UNLOCKED',
          achievementId: data.achievementId,
        },
      });

      // Email
      // We can use a generic "Achievement" template if we had one.
      // Let's assume we want to send an email for this.
      // I'll need to add an ACHIEVEMENT_UNLOCKED template to email-templates.ts first.
    }

  } catch (error) {
    logger.error('Error handling gamification event', error);
  }
};
