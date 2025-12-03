import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { achievementService } from './achievement.service.ts';
import kafkaClient from '../kafka.ts';
import { emitLeaderboardUpdate } from '../websocket/leaderboard-socket.ts';

const logger = createLogger('rules-engine');

export class RulesEngine {
  async processEvent(userId: string, eventType: string, data: any) {
    logger.info('Processing gamification event', { userId, eventType });

    let points = 0;
    let actions = 0;

    switch (eventType) {
      case 'TOPIC_COMPLETED':
        points = 50;
        actions = 1;
        break;
      case 'FLASHCARD_REVIEWED':
        points = 10;
        actions = 1;
        break;
      default:
        points = 0;
    }

    if (points > 0) {
      await this.awardPoints(userId, points);
      await this.logDailyActivity(userId, points, actions);
      await this.checkLevelUp(userId);
    }

    await this.updateStreak(userId);
    await achievementService.checkAchievements(userId, eventType, data);
  }

  private async awardPoints(userId: string, points: number) {
    await prisma.userProgress.upsert({
      where: { userId },
      update: { points: { increment: points } },
      create: { userId, points },
    });
    logger.info('Points awarded', { userId, points });
    
    // Emit real-time leaderboard update
    emitLeaderboardUpdate('GLOBAL', { userId, points });
  }

  private async logDailyActivity(userId: string, points: number, actions: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyActivity.upsert({
        where: { 
            userId_date: {
                userId,
                date: today
            }
        },
        update: {
            points: { increment: points },
            actions: { increment: actions }
        },
        create: {
            userId,
            date: today,
            points,
            actions
        }
    });
  }

  private async updateStreak(userId: string) {
    const userProgress = await prisma.userProgress.findUnique({ where: { userId } });
    
    if (!userProgress) return;

    // Get the last daily activity before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = await prisma.dailyActivity.findFirst({
        where: {
            userId,
            date: { lt: today }
        },
        orderBy: { date: 'desc' }
    });

    let newStreak = 1; // Default to 1 if active today

    if (lastActivity) {
        const lastDate = new Date(lastActivity.date);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day
            newStreak = userProgress.streak + 1;
        } else {
            // Streak broken
            newStreak = 1;
        }
    } else {
        // First ever activity or no previous history
        newStreak = 1;
    }
    
    // Only update if streak changed (to avoid DB writes on every action if already updated for today)
    // But wait, if we are active today, streak should be maintained.
    // The logic above resets to 1 if gap > 1 day.
    // If we already updated streak today, we shouldn't increment it again.
    // We need to check if we already have activity today.
    
    const activityToday = await prisma.dailyActivity.findUnique({
        where: { userId_date: { userId, date: today } }
    });
    
    // If this is the FIRST action of today, we update the streak.
    // If we already have activity today (actions > 1 because we just incremented it), we don't change streak.
    
    if (activityToday && activityToday.actions === 1) {
         await prisma.userProgress.update({
            where: { userId },
            data: { streak: newStreak }
        });
        logger.info('Streak updated', { userId, newStreak });
    }
  }

  private async checkLevelUp(userId: string) {
    const progress = await prisma.userProgress.findUnique({ where: { userId } });
    if (!progress) return;

    const currentLevel = progress.level;
    const calculatedLevel = Math.floor(progress.points / 1000) + 1;

    if (calculatedLevel > currentLevel) {
      await prisma.userProgress.update({
        where: { userId },
        data: { level: calculatedLevel }
      });
      logger.info(`User ${userId} leveled up to ${calculatedLevel}`);
      
      // Publish Level Up Event
      await kafkaClient.send('gamification-events', [{
        type: 'LEVEL_UP',
        userId,
        data: {
          level: calculatedLevel,
          points: progress.points
        }
      }]);
    }
  }
}
