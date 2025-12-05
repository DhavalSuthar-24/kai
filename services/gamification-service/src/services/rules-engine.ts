import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { achievementService } from './achievement.service.ts';
import kafkaClient from '../kafka.ts';
import { emitLeaderboardUpdate } from '../websocket/leaderboard-socket.ts';
import { leaderboardService } from './leaderboard.service.ts';

const logger = createLogger('rules-engine');

import { levelProgressionService } from './level-progression.service.ts';

export class RulesEngine {

  async processEvent(userId: string, eventType: string, data: Record<string, any>) {
    logger.info('Processing gamification event', { userId, eventType });

    let basePoints = 0;
    let actions = 0;

    const POINTS_TOPIC_COMPLETED = 50;
    const POINTS_FLASHCARD_REVIEWED = 10;
    const POINTS_CHALLENGE_WON = 100;

    switch (eventType) {
      case 'TOPIC_COMPLETED':
        basePoints = POINTS_TOPIC_COMPLETED;
        actions = 1;
        break;
      case 'FLASHCARD_REVIEWED':
        basePoints = POINTS_FLASHCARD_REVIEWED;
        actions = 1;
        break;
      case 'CHALLENGE_WON':
        basePoints = POINTS_CHALLENGE_WON;
        actions = 1;
        break;
      default:
        basePoints = 0;
    }

    if (basePoints > 0) {
      // Calculate points with multipliers (streak, level, etc.)
      const points = await levelProgressionService.awardPointsWithMultipliers(userId, basePoints, eventType);
      
      await this.awardPoints(userId, points);
      await this.logDailyActivity(userId, points, actions);
      
      // Check for level up using the new service
      await levelProgressionService.checkLevelUp(userId);
    }

    await this.updateStreak(userId);
    await achievementService.checkAchievements(userId, eventType, data);
  }

  private async awardPoints(userId: string, points: number) {
    const progress = await prisma.userProgress.upsert({
      where: { userId },
      update: { points: { increment: points } },
      create: { userId, points },
    });
    logger.info('Points awarded', { userId, points });
    
    // Update Redis
    await leaderboardService.updateScore(userId, progress.points);
    
    // Emit real-time leaderboard update
    emitLeaderboardUpdate('GLOBAL', { userId, points: progress.points });
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


}
