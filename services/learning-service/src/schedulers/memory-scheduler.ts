import cron from 'node-cron';
import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { memoryService } from '../services/memory.service.ts';
import { subDays } from 'date-fns';

const logger = createLogger('memory-scheduler');

export const startMemoryScheduler = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running nightly memory generation job');
    
    try {
      // Get all users who had activity yesterday
      // Optimization: In real app, query distinct userIds from KaizenSession yesterday
      const yesterday = subDays(new Date(), 1);
      
      const activeUsers = await prisma.kaizenSession.findMany({
        where: {
          startedAt: {
            gte: subDays(new Date(), 1) // Activity in last 24h
          }
        },
        distinct: ['userId'],
        select: { userId: true }
      });

      logger.info(`Found ${activeUsers.length} active users for memory generation`);

      for (const user of activeUsers) {
        await memoryService.generateDailyRecap(user.userId, yesterday);
      }
      
    } catch (error) {
      logger.error('Error in memory scheduler', error);
    }
  });
  
  logger.info('Memory scheduler started');
};
