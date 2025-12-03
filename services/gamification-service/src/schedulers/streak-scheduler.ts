import prisma from '../prisma.ts';
import kafkaClient from '../kafka.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('streak-scheduler');

export const checkStreaks = async () => {
  logger.info('Running streak check...');
  
  // Find users who haven't been active today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // In a real app, we'd query for users where last DailyActivity < today
  // For now, let's just find all users and check their last activity
  // This is inefficient for large datasets but fine for prototype
  
  const users = await prisma.userProgress.findMany();
  
  for (const user of users) {
      const lastActivity = await prisma.dailyActivity.findFirst({
          where: { userId: user.userId },
          orderBy: { date: 'desc' }
      });
      
      if (!lastActivity || new Date(lastActivity.date) < today) {
          // User hasn't been active today
          // Send warning if they have a streak > 0
          if (user.streak > 0) {
              logger.info(`User ${user.userId} is at risk of losing streak`, { streak: user.streak });
              
              await kafkaClient.send('reminder-events', [{
                  type: 'STREAK_WARNING',
                  data: {
                      userId: user.userId,
                      streak: user.streak,
                      timestamp: new Date()
                  }
              }]);
          }
      }
  }
};

// Simple interval for prototype (e.g., run every hour)
// In production, use node-cron
export const startStreakScheduler = () => {
    setInterval(checkStreaks, 60 * 60 * 1000); // Every hour
    // Run once on startup for demo
    checkStreaks();
};
