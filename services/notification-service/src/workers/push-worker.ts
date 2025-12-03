import { QueueFactory, createLogger } from '@shared/index.ts';
import { Job } from 'bullmq';
import { FirebaseService } from '../services/firebase.service.ts';
import { PreferenceChecker } from '../services/preference-checker.ts';
import { RateLimiter } from '../services/rate-limiter.ts';
import { RetryService } from '../services/retry-service.ts';
import { DeviceTokenService } from '../services/device-token.service.ts';
import { NotificationChannel, NotificationType, NotificationStatus } from '../types/notifications.ts';
import prisma from '../prisma.ts';
import Redis from 'ioredis';

const logger = createLogger('push-worker');

// Initialize services
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const firebaseService = new FirebaseService(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const preferenceChecker = new PreferenceChecker(redis);
const rateLimiter = new RateLimiter(redis, {
  emailPerHour: parseInt(process.env.RATE_LIMIT_EMAIL_PER_HOUR || '10'),
  pushPerHour: parseInt(process.env.RATE_LIMIT_PUSH_PER_HOUR || '50'),
});
const retryService = new RetryService();
const deviceTokenService = new DeviceTokenService();

export const pushQueue = QueueFactory.createQueue('push-queue');

interface PushJobData {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  imageUrl?: string;
  templateId?: string;
}

const processPushJob = async (job: Job<PushJobData>) => {
  const { userId, title, body, type, data, imageUrl, templateId } = job.data;
  
  logger.info(`Processing push job ${job.id}`, { userId, title, type });

  let historyId: string | undefined;

  try {
    // 1. Check user preferences
    const preferenceCheck = await preferenceChecker.checkPreference(
      userId,
      type,
      NotificationChannel.PUSH
    );

    if (!preferenceCheck.allowed) {
      logger.info(`Push blocked by user preference: ${preferenceCheck.reason}`, { userId, type });
      return { skipped: true, reason: preferenceCheck.reason };
    }

    // 2. Check rate limit
    const rateLimit = await rateLimiter.checkRateLimit(userId, 'PUSH');
    if (!rateLimit.allowed) {
      logger.warn(`Push rate limit exceeded for user ${userId}`);
      // Re-queue for later
      await pushQueue.add(
        'push-delayed',
        job.data,
        { delay: 3600000 } // Retry in 1 hour
      );
      return { skipped: true, reason: 'Rate limit exceeded' };
    }

    // 3. Get user device tokens
    const tokens = await deviceTokenService.getUserTokens(userId);
    
    if (tokens.length === 0) {
      logger.warn(`No device tokens found for user ${userId}`);
      return { skipped: true, reason: 'No device tokens' };
    }

    // 4. Create notification history record
    const history = await prisma.notificationHistory.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        templateId,
        subject: title,
        body,
        metadata: JSON.stringify({ data, imageUrl, tokenCount: tokens.length }),
      },
    });
    historyId = history.id;

    // 5. Send push notification via Firebase
    const result = await firebaseService.sendMulticastPushNotification(tokens, {
      title,
      body,
      data,
      imageUrl,
    });

    // 6. Handle invalid tokens
    if (result.invalidTokens.length > 0) {
      await deviceTokenService.markTokensInvalid(result.invalidTokens);
      logger.info(`Marked ${result.invalidTokens.length} tokens as invalid`);
    }

    if (result.successCount > 0) {
      // At least some notifications sent successfully
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          metadata: JSON.stringify({
            data,
            imageUrl,
            tokenCount: tokens.length,
            successCount: result.successCount,
            failureCount: result.failureCount,
          }),
        },
      });

      logger.info(`Push notification sent to ${result.successCount}/${tokens.length} devices`, {
        userId,
        successCount: result.successCount,
        failureCount: result.failureCount,
      });

      return {
        success: true,
        successCount: result.successCount,
        failureCount: result.failureCount,
      };
    } else {
      // All notifications failed - add to retry queue
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: 'All devices failed',
        },
      });

      await retryService.addToRetryQueue(historyId, 'All devices failed');

      logger.error(`Push notification failed for all devices`, { userId });
      throw new Error('All devices failed');
    }
  } catch (error: any) {
    logger.error(`Push job ${job.id} failed`, error);

    // Update history if it was created
    if (historyId) {
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: error.message,
        },
      }).catch(err => logger.error('Failed to update history', err));
    }

    throw error;
  }
};

export const pushWorker = QueueFactory.createWorker('push-queue', processPushJob);

pushWorker.on('completed', (job) => {
  logger.info(`Push job ${job.id} completed`);
});

pushWorker.on('failed', (job, err) => {
  logger.error(`Push job ${job?.id} failed`, err);
});

logger.info('Push worker started');
