import { createLogger } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

const logger = createLogger('gamification-notification-consumer');

export async function handleGamificationNotificationEvent(message: any) {
  const eventType = message.type;
  
  try {
    switch (eventType) {
      case 'LEVEL_UP':
        await handleLevelUp(message.data);
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        await handleAchievementUnlocked(message.data);
        break;
      case 'STREAK_UPDATED':
        await handleStreakUpdated(message.data);
        break;
      case 'CHALLENGE_COMPLETED':
        await handleChallengeCompleted(message.data);
        break;
      default:
        // Ignore other events
        break;
    }
  } catch (error) {
    logger.error(`Failed to handle gamification notification event: ${eventType}`, error);
  }
}

async function handleLevelUp(data: any) {
  const { userId, newLevel, totalPoints } = data;
  
  logger.info(`Sending level up notification for user ${userId}: Level ${newLevel}`);
  
  // Send push notification
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId,
      channel: 'PUSH',
      title: `Level ${newLevel} Unlocked! 🎉`,
      body: `Congratulations! You've reached level ${newLevel} with ${totalPoints} points!`,
      data: {
        type: 'LEVEL_UP',
        level: newLevel,
        points: totalPoints
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}

async function handleAchievementUnlocked(data: any) {
  const { userId, name, points } = data;
  
  logger.info(`Sending achievement notification for user ${userId}: ${name}`);
  
  // Send push notification
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId,
      channel: 'PUSH',
      title: 'Achievement Unlocked! 🏆',
      body: `You earned "${name}" (+${points} points)`,
      data: {
        type: 'ACHIEVEMENT',
        name,
        points
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}

async function handleStreakUpdated(data: any) {
  const { userId, streak, isRecord } = data;
  
  // Only notify on milestones or records
  if (streak % 7 === 0 || isRecord) {
    logger.info(`Sending streak notification for user ${userId}: ${streak} days`);
    
    const title = isRecord ? `New Record! ${streak} Day Streak! 🔥` : `${streak} Day Streak! 🔥`;
    const body = isRecord 
      ? `Amazing! You've set a new personal record!`
      : `Keep it up! You're on fire!`;
    
    await kafkaClient.send('notification-events', [{
      type: 'NOTIFICATION_REQUESTED',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        channel: 'PUSH',
        title,
        body,
        data: {
          type: 'STREAK',
          streak,
          isRecord
        }
      },
      metadata: {
        correlationId: crypto.randomUUID(),
        source: 'notification-service'
      }
    }]);
  }
}

async function handleChallengeCompleted(data: any) {
  const { userId, score, rank } = data;
  
  logger.info(`Sending challenge completion notification for user ${userId}`);
  
  await kafkaClient.send('notification-events', [{
    type: 'NOTIFICATION_REQUESTED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      userId,
      channel: 'PUSH',
      title: 'Challenge Complete! 🎯',
      body: `You scored ${score} and ranked #${rank}!`,
      data: {
        type: 'CHALLENGE_COMPLETE',
        score,
        rank
      }
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'notification-service'
    }
  }]);
}
