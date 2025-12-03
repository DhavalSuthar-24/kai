import { QueueFactory, createLogger } from '@shared/index.ts';
import { Job } from 'bullmq';
import { SendGridService } from '../services/sendgrid.service.ts';
import { PreferenceChecker } from '../services/preference-checker.ts';
import { RateLimiter } from '../services/rate-limiter.ts';
import { RetryService } from '../services/retry-service.ts';
import { NotificationChannel, NotificationType, NotificationStatus } from '../types/notifications.ts';
import prisma from '../prisma.ts';
import Redis from 'ioredis';

const logger = createLogger('email-worker');

// Initialize services
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const sendGridService = new SendGridService(
  process.env.SENDGRID_API_KEY || '',
  process.env.SENDGRID_FROM_EMAIL || 'noreply@kai.app'
);

const preferenceChecker = new PreferenceChecker(redis);
const rateLimiter = new RateLimiter(redis, {
  emailPerHour: parseInt(process.env.RATE_LIMIT_EMAIL_PER_HOUR || '10'),
  pushPerHour: parseInt(process.env.RATE_LIMIT_PUSH_PER_HOUR || '50'),
});
const retryService = new RetryService();

export const emailQueue = QueueFactory.createQueue('email-queue');

interface EmailJobData {
  userId: string;
  to: string;
  subject: string;
  body: string;
  type: NotificationType;
  templateId?: string;
  variables?: Record<string, any>;
  unsubscribeUrl?: string;
}

const processEmailJob = async (job: Job<EmailJobData>) => {
  const { userId, to, subject, body, type, templateId, variables, unsubscribeUrl } = job.data;
  
  logger.info(`Processing email job ${job.id}`, { userId, to, subject, type });

  let historyId: string | undefined;

  try {
    // 1. Check user preferences
    const preferenceCheck = await preferenceChecker.checkPreference(
      userId,
      type,
      NotificationChannel.EMAIL
    );

    if (!preferenceCheck.allowed) {
      logger.info(`Email blocked by user preference: ${preferenceCheck.reason}`, { userId, type });
      return { skipped: true, reason: preferenceCheck.reason };
    }

    // 2. Check rate limit
    const rateLimit = await rateLimiter.checkRateLimit(userId, 'EMAIL');
    if (!rateLimit.allowed) {
      logger.warn(`Email rate limit exceeded for user ${userId}`);
      // Re-queue for later
      await emailQueue.add(
        'email-delayed',
        job.data,
        { delay: 3600000 } // Retry in 1 hour
      );
      return { skipped: true, reason: 'Rate limit exceeded' };
    }

    // 3. Create notification history record
    const history = await prisma.notificationHistory.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        templateId,
        subject,
        body,
        metadata: JSON.stringify({ variables, to }),
      },
    });
    historyId = history.id;

    // 4. Send email via SendGrid
    const result = await sendGridService.sendEmail(
      to,
      subject,
      body,
      undefined,
      unsubscribeUrl
    );

    if (result.success) {
      // Update history as sent
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          metadata: JSON.stringify({
            ...variables,
            to,
            messageId: result.messageId,
          }),
        },
      });

      logger.info(`Email sent successfully to ${to}`, {
        userId,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } else {
      // Send failed - add to retry queue
      await prisma.notificationHistory.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: result.error,
        },
      });

      await retryService.addToRetryQueue(historyId, result.error || 'Unknown error');

      logger.error(`Email send failed: ${result.error}`, { userId, to });
      throw new Error(result.error);
    }
  } catch (error: any) {
    logger.error(`Email job ${job.id} failed`, error);

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

export const emailWorker = QueueFactory.createWorker('email-queue', processEmailJob);

emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed`, err);
});

logger.info('Email worker started');
