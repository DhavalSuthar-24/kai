import { createLogger } from '@shared/index.ts';

const logger = createLogger('recommendation-service');

export class ContentRecommendationService {
  async recommendContent(context: any) {
    const { availableTime, mentalState, timeOfDay } = context;
    const { stress_score, focus_capacity } = mentalState || { stress_score: 0, focus_capacity: 100 };

    let contentType = 'LESSON';
    let difficulty = 'NORMAL';
    let duration = availableTime;

    // 1. Time-based decision
    if (availableTime < 5) {
      contentType = 'FLASHCARD';
    } else if (availableTime < 15) {
      contentType = 'QUIZ';
    } else if (availableTime < 30) {
      contentType = 'MICRO_LESSON';
    } else {
      contentType = 'DEEP_DIVE';
    }

    // 2. Mental State Adjustment
    if (focus_capacity < 40 || stress_score > 7) {
      difficulty = 'EASY';
      if (contentType === 'DEEP_DIVE') contentType = 'REVIEW';
      if (contentType === 'MICRO_LESSON') contentType = 'VIDEO'; // Passive
    } else if (focus_capacity > 80 && stress_score < 3) {
      difficulty = 'HARD';
    }

    // 3. Time of Day Optimization
    if (timeOfDay === 'NIGHT') {
       // Avoid heavy cognitive load
       if (contentType === 'DEEP_DIVE') contentType = 'FLASHCARD';
       difficulty = 'EASY'; // Wind down
    }

    logger.info(`Recommended content: ${contentType} (${difficulty}) for context`, { context });

    // In a real system, we would now query the DB for actual content matching these criteria.
    // For now, returning the strategy.
    return {
      contentType,
      difficulty,
      estimatedDuration: Math.min(duration, availableTime),
      reason: `Time: ${availableTime}m, Stress: ${stress_score}, Focus: ${focus_capacity}`
    };
  }
}
