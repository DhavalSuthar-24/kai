import { createLogger } from '@shared/index.ts';

const logger = createLogger('smart-limit-service');

export class SmartLimitService {
  calculateLimit(userContext: any, appPackageName: string): number {
    // Default base limit
    let baseLimit = 30; // minutes

    // 1. Goal-based adjustments
    // In real app, check userContext.activeGoals for "limit social media" goals
    
    // 2. Streak reward
    // Mocking streak check from context
    const currentStreak = userContext.streak || 0;
    if (currentStreak > 7) {
      baseLimit += 10; // Reward
    }

    // 3. Productivity Hours
    const hour = new Date().getHours();
    // Assuming userContext.productivity.peakHours = [9, 10, 11]
    const peakHours = [9, 10, 11, 14, 15, 16];
    if (peakHours.includes(hour)) {
      baseLimit = Math.round(baseLimit * 0.7); // Stricter during peak
    }

    // 4. Weekend Relaxation
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      baseLimit = Math.round(baseLimit * 1.5);
    }

    logger.debug(`Calculated limit for ${appPackageName}: ${baseLimit}m`);
    return baseLimit;
  }
}
