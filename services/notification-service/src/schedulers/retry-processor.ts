import cron from 'node-cron';
import { createLogger } from '@shared/index.ts';
import { RetryService } from '../services/retry-service.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { pushQueue } from '../workers/push-worker.ts';
import prisma from '../prisma.ts';
import { NotificationChannel } from '../types/notifications.ts';

const logger = createLogger('retry-processor');

const retryService = new RetryService();

/**
 * Retry queue processor
 * Runs every 5 minutes to process failed notifications
 */
export const startRetryProcessor = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running retry processor');

    try {
      const readyForRetry = await retryService.getReadyForRetry();

      if (readyForRetry.length === 0) {
        logger.debug('No notifications ready for retry');
        return;
      }

      logger.info(`Processing ${readyForRetry.length} notifications for retry`);

      for (const item of readyForRetry) {
        try {
          // Get the original notification
          const notification = await prisma.notificationHistory.findUnique({
            where: { id: item.notificationId },
          });

          if (!notification) {
            logger.warn(`Notification ${item.notificationId} not found`);
            continue;
          }

          const metadata = JSON.parse(notification.metadata || '{}');

          // Re-queue the notification based on channel
          if (notification.channel === NotificationChannel.EMAIL) {
            await emailQueue.add('retry-email', {
              userId: notification.userId,
              to: metadata.to,
              subject: notification.subject || '',
              body: notification.body || '',
              type: notification.type as any,
              variables: metadata.variables,
              unsubscribeUrl: metadata.unsubscribeUrl,
            });
          } else if (notification.channel === NotificationChannel.PUSH) {
            await pushQueue.add('retry-push', {
              userId: notification.userId,
              title: notification.subject || '',
              body: notification.body || '',
              type: notification.type as any,
              data: metadata.data,
              imageUrl: metadata.imageUrl,
            });
          }

          logger.info(`Re-queued notification ${item.notificationId} (retry ${item.retryCount + 1})`);
        } catch (error) {
          logger.error(`Failed to retry notification ${item.notificationId}`, error);
          await retryService.updateRetryQueue(item.id, false, (error as Error).message);
        }
      }
    } catch (error) {
      logger.error('Retry processor failed', error);
    }
  });

  logger.info('Retry processor started (runs every 5 minutes)');
};
