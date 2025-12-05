import { createLogger } from '@shared/index.ts';

const logger = createLogger('gamification-consumer');

export async function handleGamificationEvent(message: any) {
  switch (message.type) {
    case 'LEVEL_UP':
      await handleLevelUp(message.data);
      break;
    case 'ACHIEVEMENT_UNLOCKED':
      await handleAchievement(message.data);
      break;
    case 'STREAK_UPDATED':
      await handleStreakUpdate(message.data);
      break;
  }
}

async function handleLevelUp(data: any) {
  const { userId, newLevel } = data;
  logger.info(`User ${userId} leveled up to ${newLevel}`);
  // Could trigger notifications or update user metadata
}

async function handleAchievement(data: any) {
  const { userId, achievementId, name } = data;
  logger.info(`User ${userId} unlocked achievement: ${name}`);
  // Could update user profile or trigger celebration
}

async function handleStreakUpdate(data: any) {
  const { userId, streak, isRecord } = data;
  logger.info(`User ${userId} streak: ${streak} days${isRecord ? ' (NEW RECORD!)' : ''}`);
  // Could trigger streak milestone notifications
}
