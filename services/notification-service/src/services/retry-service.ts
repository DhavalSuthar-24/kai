import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { QueueStatus } from '../types/notifications.ts';

const logger = createLogger('retry-service');

export interface RetryConfig {
  maxRetries: number;
  retryIntervals: number[]; // in minutes
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  retryIntervals: [5, 15, 60, 360, 1440], // 5min, 15min, 1hr, 6hr, 24hr
};

export class RetryService {
  private config: RetryConfig;

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
  }

  /**
   * Add a failed notification to the retry queue
   */
  async addToRetryQueue(
    notificationId: string,
    error: string
  ): Promise<void> {
    try {
      const nextRetryAt = this.calculateNextRetry(0);

      await prisma.notificationQueue.create({
        data: {
          notificationId,
          retryCount: 0,
          maxRetries: this.config.maxRetries,
          nextRetryAt,
          lastError: error,
          status: QueueStatus.PENDING,
        },
      });

      logger.info(`Added notification ${notificationId} to retry queue`, {
        notificationId,
        nextRetryAt,
      });
    } catch (error) {
      logger.error('Failed to add to retry queue', error);
      throw error;
    }
  }

  /**
   * Update retry queue after a retry attempt
   */
  async updateRetryQueue(
    queueId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const queueItem = await prisma.notificationQueue.findUnique({
        where: { id: queueId },
      });

      if (!queueItem) {
        logger.warn(`Queue item ${queueId} not found`);
        return;
      }

      if (success) {
        // Mark as succeeded
        await prisma.notificationQueue.update({
          where: { id: queueId },
          data: {
            status: QueueStatus.SUCCEEDED,
          },
        });

        logger.info(`Notification ${queueItem.notificationId} retry succeeded`);
        return;
      }

      // Retry failed
      const newRetryCount = queueItem.retryCount + 1;

      if (newRetryCount >= this.config.maxRetries) {
        // Max retries reached
        await prisma.notificationQueue.update({
          where: { id: queueId },
          data: {
            status: QueueStatus.FAILED,
            lastError: error || 'Max retries reached',
            retryCount: newRetryCount,
          },
        });

        logger.error(`Notification ${queueItem.notificationId} failed after ${newRetryCount} retries`);
        return;
      }

      // Schedule next retry with exponential backoff
      const nextRetryAt = this.calculateNextRetry(newRetryCount);

      await prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          retryCount: newRetryCount,
          nextRetryAt,
          lastError: error || 'Retry failed',
          status: QueueStatus.RETRYING,
        },
      });

      logger.info(`Scheduled retry ${newRetryCount} for notification ${queueItem.notificationId}`, {
        nextRetryAt,
      });
    } catch (error) {
      logger.error('Failed to update retry queue', error);
      throw error;
    }
  }

  /**
   * Get all notifications ready for retry
   */
  async getReadyForRetry(): Promise<Array<{
    id: string;
    notificationId: string;
    retryCount: number;
  }>> {
    try {
      const items = await prisma.notificationQueue.findMany({
        where: {
          status: {
            in: [QueueStatus.PENDING, QueueStatus.RETRYING],
          },
          nextRetryAt: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
          notificationId: true,
          retryCount: true,
        },
      });

      return items;
    } catch (error) {
      logger.error('Failed to get retry queue', error);
      return [];
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(retryCount: number): Date {
    const intervalMinutes = this.config.retryIntervals[retryCount] || 
                           this.config.retryIntervals[this.config.retryIntervals.length - 1];
    
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + intervalMinutes);
    
    return nextRetry;
  }

  /**
   * Clean up old succeeded/failed queue items (older than 7 days)
   */
  async cleanupOldQueueItems(): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await prisma.notificationQueue.deleteMany({
        where: {
          status: {
            in: [QueueStatus.SUCCEEDED, QueueStatus.FAILED],
          },
          updatedAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old queue items`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old queue items', error);
      return 0;
    }
  }
}
