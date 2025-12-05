import cron from 'node-cron';
import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('cleanup-scheduler');

// Run every day at midnight
export const startCleanupJob = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting daily cleanup job...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Hard delete captures that were soft deleted > 30 days ago
      // Note: We need to use deleteMany with a raw query or bypass middleware if possible,
      // but our middleware transforms 'delete' to 'update'.
      // To hard delete, we might need a specific flag or use deleteMany on the raw client if exposed,
      // OR we can just update our middleware to allow hard delete if a specific flag is passed.
      // For now, let's assume we can't easily bypass middleware without changing it.
      // Actually, the middleware intercepts 'delete' and 'deleteMany'.
      // If we want to HARD delete, we might need to use `prisma.$executeRaw` or add a bypass.
      
      // Let's use $executeRaw for true hard delete to bypass middleware
      const deletedCaptures = await prisma.$executeRaw`
        DELETE FROM "Capture" 
        WHERE "deletedAt" IS NOT NULL 
        AND "deletedAt" < ${thirtyDaysAgo}
      `;

      logger.info(`Cleanup job completed. Hard deleted ${deletedCaptures} captures.`);
    } catch (error) {
      logger.error('Error running cleanup job', error);
    }
  });
};
