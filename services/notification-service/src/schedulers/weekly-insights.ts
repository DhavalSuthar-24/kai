import cron from 'node-cron';
import { createLogger } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { TemplateRenderer } from '../services/template-renderer.ts';
import { EMAIL_TEMPLATES } from '../templates/email-templates.ts';
import { NotificationType } from '../types/notifications.ts';
import prisma from '../prisma.ts';

const logger = createLogger('weekly-insights-scheduler');

/**
 * Weekly insights scheduler
 * Runs every Sunday at 9 AM
 */
export const startWeeklyInsightsScheduler = () => {
  // Cron format: minute hour day-of-month month day-of-week
  // 0 9 * * 0 = Every Sunday at 9:00 AM
  cron.schedule('0 9 * * 0', async () => {
    logger.info('Running weekly insights scheduler');

    try {
      // In a real implementation, you would:
      // 1. Query all active users
      // 2. Aggregate their weekly stats from various services
      // 3. Send personalized insights emails

      // For now, this is a placeholder that would integrate with:
      // - Learning service for flashcard/topic stats
      // - Gamification service for streak/points
      // - Focus service for focus time

      logger.info('Weekly insights scheduler completed');
    } catch (error) {
      logger.error('Weekly insights scheduler failed', error);
    }
  });

  logger.info('Weekly insights scheduler started (runs every Sunday at 9 AM)');
};

/**
 * Send weekly insights email to a specific user
 */
export const sendWeeklyInsights = async (
  userId: string,
  email: string,
  userName: string,
  stats: {
    flashcardsReviewed: number;
    topicsCompleted: number;
    focusMinutes: number;
    streak: number;
  }
) => {
  try {
    const template = EMAIL_TEMPLATES.WEEKLY_INSIGHTS;
    const variables = {
      userName,
      weeklyStats: stats,
      dashboardUrl: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
      unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${userId}`,
    };

    const htmlBody = TemplateRenderer.render(template.body, variables);
    const subject = TemplateRenderer.render(template.subject, variables);

    await emailQueue.add('weekly-insights', {
      userId,
      to: email,
      subject,
      body: htmlBody,
      type: NotificationType.WEEKLY_INSIGHTS,
      variables,
      unsubscribeUrl: variables.unsubscribeUrl,
    });

    logger.info('Queued weekly insights email', { userId });
  } catch (error) {
    logger.error('Failed to send weekly insights', error);
  }
};
