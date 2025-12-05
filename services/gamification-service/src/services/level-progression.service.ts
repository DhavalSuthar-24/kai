import prisma from '../prisma.ts';
import { createLogger } from '@shared/logger';
import kafkaClient from '../kafka.ts';

const logger = createLogger('level-progression-service');

// Level thresholds with exponential curve
const LEVEL_THRESHOLDS = [
  { level: 1, points: 0, reward: { points: 0, title: 'Beginner' } },
  { level: 2, points: 100, reward: { points: 50, title: 'Learner' } },
  { level: 3, points: 250, reward: { points: 75, title: 'Student' } },
  { level: 4, points: 500, reward: { points: 100, title: 'Scholar' } },
  { level: 5, points: 1000, reward: { points: 150, title: 'Expert' } },
  { level: 6, points: 1750, reward: { points: 200, title: 'Master' } },
  { level: 7, points: 2750, reward: { points: 250, title: 'Guru' } },
  { level: 8, points: 4000, reward: { points: 300, title: 'Sage' } },
  { level: 9, points: 5500, reward: { points: 400, title: 'Legend' } },
  { level: 10, points: 7500, reward: { points: 500, title: 'Grandmaster' } },
  { level: 11, points: 10000, reward: { points: 600, title: 'Elite' } },
  { level: 12, points: 13000, reward: { points: 700, title: 'Champion' } },
  { level: 13, points: 16500, reward: { points: 800, title: 'Hero' } },
  { level: 14, points: 20500, reward: { points: 900, title: 'Titan' } },
  { level: 15, points: 25000, reward: { points: 1000, title: 'Immortal' } },
];

export interface LevelInfo {
  currentLevel: number;
  currentPoints: number;
  pointsToNextLevel: number;
  nextLevel: number;
  progress: number; // 0-100
  title: string;
  rewards?: {
    points: number;
    badges?: string[];
  };
}

export class LevelProgressionService {
  /**
   * Calculate level from points
   */
  calculateLevel(points: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (points >= LEVEL_THRESHOLDS[i].points) {
        return LEVEL_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  /**
   * Get level information for a user
   */
  async getLevelInfo(userId: string): Promise<LevelInfo> {
    const progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      return this.getDefaultLevelInfo();
    }

    const currentLevel = this.calculateLevel(progress.points);
    const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)!;
    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);

    if (!nextThreshold) {
      // Max level reached
      return {
        currentLevel,
        currentPoints: progress.points,
        pointsToNextLevel: 0,
        nextLevel: currentLevel,
        progress: 100,
        title: currentThreshold.reward.title
      };
    }

    const pointsInCurrentLevel = progress.points - currentThreshold.points;
    const pointsNeededForNextLevel = nextThreshold.points - currentThreshold.points;
    const progressPercentage = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;

    return {
      currentLevel,
      currentPoints: progress.points,
      pointsToNextLevel: nextThreshold.points - progress.points,
      nextLevel: nextThreshold.level,
      progress: Math.min(100, Math.max(0, progressPercentage)),
      title: currentThreshold.reward.title
    };
  }

  /**
   * Check and process level up
   */
  async checkLevelUp(userId: string): Promise<{
    leveledUp: boolean;
    newLevel?: number;
    rewards?: any;
  }> {
    const progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      return { leveledUp: false };
    }

    const calculatedLevel = this.calculateLevel(progress.points);

    if (calculatedLevel > progress.level) {
      // Level up!
      const levelThreshold = LEVEL_THRESHOLDS.find(t => t.level === calculatedLevel)!;
      
      // Award bonus points
      const bonusPoints = levelThreshold.reward.points;
      
      await prisma.userProgress.update({
        where: { userId },
        data: {
          level: calculatedLevel,
          points: { increment: bonusPoints }
        }
      });

      logger.info(`User ${userId} leveled up to ${calculatedLevel}`, {
        bonusPoints,
        title: levelThreshold.reward.title
      });

      // Publish LEVEL_UP event
      await kafkaClient.send('gamification-events', [{
        type: 'LEVEL_UP',
        data: {
          userId,
          level: calculatedLevel,
          previousLevel: progress.level,
          bonusPoints,
          title: levelThreshold.reward.title,
          timestamp: new Date()
        }
      }]);

      return {
        leveledUp: true,
        newLevel: calculatedLevel,
        rewards: {
          points: bonusPoints,
          title: levelThreshold.reward.title
        }
      };
    }

    return { leveledUp: false };
  }

  /**
   * Get all level thresholds (for UI display)
   */
  getLevelThresholds() {
    return LEVEL_THRESHOLDS.map(t => ({
      level: t.level,
      points: t.points,
      title: t.reward.title,
      bonusPoints: t.reward.points
    }));
  }

  /**
   * Calculate points with multipliers
   */
  calculatePointsWithMultiplier(
    basePoints: number,
    multipliers: {
      streak?: number;
      level?: number;
      premium?: boolean;
      event?: number;
    }
  ): number {
    let points = basePoints;

    // Streak multiplier (1% per day, max 50%)
    if (multipliers.streak) {
      const streakBonus = Math.min(multipliers.streak * 0.01, 0.5);
      points += basePoints * streakBonus;
    }

    // Level multiplier (5% per level above 5)
    if (multipliers.level && multipliers.level > 5) {
      const levelBonus = (multipliers.level - 5) * 0.05;
      points += basePoints * levelBonus;
    }

    // Premium multiplier (2x)
    if (multipliers.premium) {
      points *= 2;
    }

    // Event multiplier (e.g., double XP weekend)
    if (multipliers.event) {
      points *= multipliers.event;
    }

    return Math.floor(points);
  }

  /**
   * Award points with multipliers
   */
  async awardPointsWithMultipliers(
    userId: string,
    basePoints: number,
    eventType: string
  ): Promise<number> {
    const progress = await prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      return basePoints;
    }

    const multipliers = {
      streak: progress.streak,
      level: progress.level,
      premium: false, // TODO: Check premium status
      event: 1 // TODO: Check active events
    };

    const finalPoints = this.calculatePointsWithMultiplier(basePoints, multipliers);

    logger.info('Points calculated with multipliers', {
      userId,
      basePoints,
      finalPoints,
      multipliers
    });

    return finalPoints;
  }

  /**
   * Get default level info
   */
  private getDefaultLevelInfo(): LevelInfo {
    return {
      currentLevel: 1,
      currentPoints: 0,
      pointsToNextLevel: 100,
      nextLevel: 2,
      progress: 0,
      title: 'Beginner'
    };
  }
}

export const levelProgressionService = new LevelProgressionService();
