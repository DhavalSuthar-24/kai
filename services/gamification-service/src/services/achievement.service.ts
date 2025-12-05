import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

const logger = createLogger('achievement-service');

export class AchievementService {
  
  async seedAchievements() {
    const achievements = [
      { name: 'First Step', description: 'Complete your first topic', points: 50, id: 'first-step' },
      { name: 'Flashcard Rookie', description: 'Review 10 flashcards', points: 100, id: 'flashcard-rookie' },
      { name: 'Focus Master', description: 'Accumulate 100 minutes of focus time', points: 200, id: 'focus-master' },
      { name: 'Streak Week', description: 'Maintain a 7-day streak', points: 500, id: 'streak-week' }
    ];

    for (const ach of achievements) {
      await prisma.achievement.upsert({
        where: { id: ach.id },
        update: ach,
        create: ach
      });
    }
    logger.info('Achievements seeded');
  }

  async checkAchievements(userId: string, type: string, data: Record<string, unknown>) {
    try {
      // Fetch user stats
      const progress = await prisma.userProgress.findUnique({ where: { userId } });
      if (!progress) return;

      // Define checks
      const checks = [
        {
          id: 'first-step',
          condition: () => type === 'TOPIC_COMPLETED' && progress.points >= 50 // Simple proxy
        },
        {
          id: 'streak-week',
          condition: () => progress.streak >= 7
        },
        // More complex checks would query aggregations
      ];

      for (const check of checks) {
        if (check.condition()) {
          await this.unlockAchievement(userId, check.id);
        }
      }

    } catch (error) {
      logger.error('Error checking achievements', error);
    }
  }

  private async unlockAchievement(userId: string, achievementId: string) {
    try {
      // Check if already unlocked
      const existing = await prisma.userAchievement.findFirst({
        where: { userId, achievementId },
        include: { achievement: true }
      });

      if (existing) return;

      await prisma.userAchievement.create({
        data: { userId, achievementId }
      });

      logger.info(`Achievement unlocked: ${achievementId} for user ${userId}`);
      
      // Fetch achievement details for event
      const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });

      // Publish Achievement Unlocked Event
      await kafkaClient.send('gamification-events', [{
        type: 'ACHIEVEMENT_UNLOCKED',
        userId,
        data: {
          achievementId,
          name: achievement?.name || achievementId,
          points: achievement?.points || 0
        }
      }]);

    } catch (error) {
      logger.error('Error unlocking achievement', error);
    }
  }

  async getAchievements() {
    return await prisma.achievement.findMany();
  }

  async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      // include: { achievement: true } // Need relation in schema
    });
  }
}

export const achievementService = new AchievementService();
