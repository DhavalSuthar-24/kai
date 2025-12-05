import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';
import { startOfDay, endOfDay, subMonths, subYears } from 'date-fns';

const logger = createLogger('memory-service');

export class MemoryService {
  
  async generateDailyRecap(userId: string, date: Date = new Date()) {
    try {
      const start = startOfDay(date);
      const end = endOfDay(date);

      logger.info(`Generating daily recap for user ${userId} on ${start.toISOString()}`);

      // 1. Aggregate Stats
      const sessions = await prisma.kaizenSession.findMany({
        where: {
          userId,
          startedAt: { gte: start, lte: end }
        }
      });

      if (sessions.length === 0) {
        logger.info(`No sessions found for user ${userId}, skipping recap.`);
        return;
      }

      const totalDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
      const totalActivities = sessions.reduce((acc, s) => acc + s.activitiesCount, 0);
      const totalFlashcards = sessions.reduce((acc, s) => acc + s.flashcardsCount, 0);

      // 2. Create Memory
      const memory = await prisma.memoryInsight.create({
        data: {
          userId,
          title: 'Daily Recap',
          description: `You focused for ${totalDuration} minutes and reviewed ${totalFlashcards} flashcards today!`,
          memoryType: 'LEARNING_BURST',
          startDate: start,
          endDate: end,
          metrics: JSON.stringify({
            totalDuration,
            totalActivities,
            totalFlashcards,
            sessionCount: sessions.length
          }),
          relatedIds: JSON.stringify(sessions.map(s => s.id))
        }
      });

      logger.info(`Generated daily recap memory: ${memory.id}`);

      // Emit MEMORY_CREATED event
      await kafkaClient.send('memory-events', [{
        type: 'MEMORY_CREATED',
        data: {
          userId,
          memoryId: memory.id,
          title: memory.title,
          type: memory.memoryType,
          timestamp: new Date().toISOString()
        }
      }]);

      return memory;

    } catch (error) {
      logger.error('Error generating daily recap', error);
    }
  }

  async getFeed(userId: string) {
    try {
      // 1. Recent Unviewed Memories
      const recentMemories = await prisma.memoryInsight.findMany({
        where: {
          userId,
          isViewed: false
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // 2. Flashbacks (On This Day)
      const oneMonthAgo = startOfDay(subMonths(new Date(), 1));
      const oneYearAgo = startOfDay(subYears(new Date(), 1));

      const flashbacks = await prisma.memoryInsight.findMany({
        where: {
          userId,
          startDate: { in: [oneMonthAgo, oneYearAgo] }
        }
      });

      return [...recentMemories, ...flashbacks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      logger.error('Error fetching memory feed', error);
      return [];
    }
  }

  async markAsViewed(memoryId: string, userId: string) {
    return await prisma.memoryInsight.update({
      where: { id: memoryId, userId },
      data: {
        isViewed: true,
        viewedAt: new Date()
      }
    });
  }
}

export const memoryService = new MemoryService();
