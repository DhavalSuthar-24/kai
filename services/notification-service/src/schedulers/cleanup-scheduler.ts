import cron from 'node-cron';
import { createLogger } from '@shared/index.ts';
import { RetryService } from '../services/retry-service.ts';
import { DeviceTokenService } from '../services/device-token.service.ts';

const logger = createLogger('cleanup-scheduler');

const retryService = new RetryService();
const deviceTokenService = new DeviceTokenService();

/**
 * Cleanup scheduler
 * Runs daily at 2 AM to clean up old data
 */
export const startCleanupScheduler = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running cleanup scheduler');

    try {
      // Clean up old queue items (7+ days old)
      const queueCleaned = await retryService.cleanupOldQueueItems();
      logger.info(`Cleaned up ${queueCleaned} old queue items`);

      // Clean up inactive device tokens (90+ days old)
      const tokensCleaned = await deviceTokenService.cleanupInactiveTokens();
      logger.info(`Cleaned up ${tokensCleaned} inactive device tokens`);

      logger.info('Cleanup scheduler completed');
    } catch (error) {
      logger.error('Cleanup scheduler failed', error);
    }
  });

  logger.info('Cleanup scheduler started (runs daily at 2 AM)');
};
