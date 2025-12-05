import { QueueFactory, createLogger } from '@shared/index.ts';
import { Job } from 'bullmq';
import { SmsService } from '../services/sms.service.ts';
import { PreferenceChecker } from '../services/preference-checker.ts';
import { RateLimiter } from '../services/rate-limiter.ts';
import { NotificationChannel, NotificationType, NotificationStatus } from '../types/notifications.ts';
import prisma from '../prisma.ts';
import Redis from 'ioredis';

const logger = createLogger('sms-worker');

// Initialize services
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const smsService = new SmsService();
const preferenceChecker = new PreferenceChecker(redis);
const rateLimiter = new RateLimiter(redis, {
  emailPerHour: parseInt(process.env.RATE_LIMIT_EMAIL_PER_HOUR || '10'),
  pushPerHour: parseInt(process.env.RATE_LIMIT_PUSH_PER_HOUR || '50'),
  // Add SMS rate limit if needed, defaulting to conservative
});

export const smsQueue = QueueFactory.createQueue('sms-queue');

interface SmsJobData {
  userId: string;
  phoneNumber: string;
  body: string;
  type: NotificationType;
}

const processSmsJob = async (job: Job<SmsJobData>) => {
  const { userId, phoneNumber, body, type } = job.data;
  
  logger.info(`Processing SMS job ${job.id}`, { userId, phoneNumber, type });

  let historyId: string | undefined;

  try {
    // 1. Check user preferences
    // Note: We need to update NotificationChannel enum to include SMS if not present, 
    // but for now we'll assume we can pass 'SMS' as string or update enum later.
    // Actually, let's check preferenceChecker implementation. It takes NotificationChannel enum.
    // We might need to cast or update the enum.
    const preferenceCheck = await preferenceChecker.checkPreference(
      userId,
      type,
      NotificationChannel.SMS
    );

    if (!preferenceCheck.allowed) {
      logger.info(`SMS blocked by user preference: ${preferenceCheck.reason}`, { userId, type });
      return { skipped: true, reason: preferenceCheck.reason };
    }

    // 2. Check rate limit (using PUSH limit as proxy or new one)
    const rateLimit = await rateLimiter.checkRateLimit(userId, 'SMS');
    if (!rateLimit.allowed) {
      logger.warn(`SMS rate limit exceeded for user ${userId}`);
      return { skipped: true, reason: 'Rate limit exceeded' };
    }

    // 3. Create notification history record
    const history = await prisma.notificationHistory.create({
      data: {
        userId,
        type,
        channel: 'SMS',
        status: NotificationStatus.PENDING,
        body,
        metadata: JSON.stringify({ phoneNumber }),
      },
    });
    historyId = history.id;

    // 4. Send SMS
    const result = await smsService.sendSms(phoneNumber, body);

    if (result.success) {
      // Update history as sent
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          metadata: JSON.stringify({
            phoneNumber,
            messageId: result.messageId,
          }),
        },
      });

      logger.info(`SMS sent successfully to ${phoneNumber}`, {
        userId,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error: any) {
    logger.error(`SMS job ${job.id} failed`, error);

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

export const smsWorker = QueueFactory.createWorker('sms-queue', processSmsJob);

smsWorker.on('completed', (job) => {
  logger.info(`SMS job ${job.id} completed`);
});

smsWorker.on('failed', (job, err) => {
  logger.error(`SMS job ${job?.id} failed`, err);
});

logger.info('SMS worker started');
