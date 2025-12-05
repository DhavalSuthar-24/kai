import { createLogger } from '@shared/index.ts';
import prisma from '../prisma.ts';
import kafkaClient from '../kafka.ts';

const logger = createLogger('learning-consumer');

// Points awarded for different activities
const POINTS = {
  FLASHCARD_REVIEWED: 5,
  TOPIC_CREATED: 10,
  TOPIC_COMPLETED: 50,
  MOCK_TEST_COMPLETED: 100,
  FOCUS_SESSION_COMPLETED: 20,
  DAILY_STREAK_BONUS: 10
};

export async function handleLearningEvent(message: any) {
  const eventType = message.type;
  const { userId } = message.data;
  
  if (!userId) {
    logger.warn(`Learning event missing userId: ${eventType}`);
    return;
  }
  
  try {
    switch (eventType) {
      case 'FLASHCARD_REVIEWED':
        await handleFlashcardReviewed(message.data);
        break;
      case 'TOPIC_CREATED':
        await handleTopicCreated(message.data);
        break;
      case 'TOPIC_COMPLETED':
        await handleTopicCompleted(message.data);
        break;
      case 'MOCK_TEST_COMPLETED':
        await handleMockTestCompleted(message.data);
        break;
      case 'FOCUS_SESSION_ENDED':
        await handleFocusSessionEnded(message.data);
        break;
      default:
        // Ignore other events
        break;
    }
  } catch (error) {
    logger.error(`Failed to handle learning event: ${eventType}`, error);
  }
}

async function handleFlashcardReviewed(data: any) {
  const { userId, quality } = data;
  
  // Award points based on quality
  let points = POINTS.FLASHCARD_REVIEWED;
  if (quality >= 4) {
    points += 2; // Bonus for good recall
  }
  
  await awardPoints(userId, points, 'FLASHCARD_REVIEWED');
  
  // Check for streak
  await updateStreak(userId);
}

async function handleTopicCreated(data: any) {
  const { userId } = data;
  
  await awardPoints(userId, POINTS.TOPIC_CREATED, 'TOPIC_CREATED');
}

async function handleTopicCompleted(data: any) {
  const { userId, topicId, score } = data;
  
  // Award points with score multiplier
  const points = Math.round(POINTS.TOPIC_COMPLETED * (score || 1));
  
  await awardPoints(userId, points, 'TOPIC_COMPLETED');
  
  // Check for achievement
  await checkTopicAchievements(userId);
}

async function handleMockTestCompleted(data: any) {
  const { userId, score, percentile } = data;
  
  // Award points based on performance
  let points = POINTS.MOCK_TEST_COMPLETED;
  if (percentile >= 90) {
    points += 50; // Top 10% bonus
  } else if (percentile >= 75) {
    points += 25; // Top 25% bonus
  }
  
  await awardPoints(userId, points, 'MOCK_TEST_COMPLETED');
  
  // Check for test achievements
  await checkTestAchievements(userId, score, percentile);
}

async function handleFocusSessionEnded(data: any) {
  const { userId, actualDuration, completed } = data;
  
  if (completed) {
    // Award points based on duration (1 point per minute)
    const points = POINTS.FOCUS_SESSION_COMPLETED + Math.floor(actualDuration / 60);
    await awardPoints(userId, points, 'FOCUS_SESSION_COMPLETED');
  }
}

async function awardPoints(userId: string, points: number, reason: string) {
  // Get or create user progress
  const userProgress = await prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      points,
      level: 1,
      streak: 0
    },
    update: {
      points: {
        increment: points
      }
    }
  });
  
  const newPoints = userProgress.points + points;
  
  // Check for level up
  const newLevel = calculateLevel(newPoints);
  if (newLevel > userProgress.level) {
    await prisma.userProgress.update({
      where: { userId },
      data: { level: newLevel }
    });
    
    // Publish level up event
    await kafkaClient.send('gamification-events', [{
      type: 'LEVEL_UP',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        oldLevel: userProgress.level,
        newLevel,
        totalPoints: newPoints
      },
      metadata: {
        correlationId: crypto.randomUUID(),
        source: 'gamification-service'
      }
    }]);
    
    logger.info(`User ${userId} leveled up to ${newLevel}`);
  }
  
  // Update daily activity
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await prisma.dailyActivity.upsert({
    where: {
      userId_date: {
        userId,
        date: today
      }
    },
    create: {
      userId,
      date: today,
      points,
      actions: 1
    },
    update: {
      points: {
        increment: points
      },
      actions: {
        increment: 1
      }
    }
  });
  
  logger.info(`Awarded ${points} points to user ${userId} for ${reason}`);
}

async function updateStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if user had activity yesterday
  const yesterdayActivity = await prisma.dailyActivity.findFirst({
    where: {
      userId,
      date: yesterday
    }
  });
  
  const userProgress = await prisma.userProgress.findUnique({
    where: { userId }
  });
  
  if (!userProgress) return;
  
  let newStreak = userProgress.streak;
  let isRecord = false;
  
  if (yesterdayActivity) {
    // Continue streak
    newStreak = userProgress.streak + 1;
  } else {
    // Check if they had activity today already
    const todayActivity = await prisma.dailyActivity.findFirst({
      where: {
        userId,
        date: today
      }
    });
    
    if (todayActivity && userProgress.streak === 0) {
      // Starting new streak
      newStreak = 1;
    } else if (!todayActivity) {
      // Streak broken
      newStreak = 0;
    }
  }
  
  // Check if it's a record
  if (newStreak > (userProgress.longestStreak || 0)) {
    isRecord = true;
    await prisma.userProgress.update({
      where: { userId },
      data: {
        streak: newStreak,
        longestStreak: newStreak
      }
    });
  } else if (newStreak !== userProgress.streak) {
    await prisma.userProgress.update({
      where: { userId },
      data: { streak: newStreak }
    });
  }
  
  // Publish streak event if changed
  if (newStreak !== userProgress.streak) {
    await kafkaClient.send('gamification-events', [{
      type: 'STREAK_UPDATED',
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        streak: newStreak,
        isRecord
      },
      metadata: {
        correlationId: crypto.randomUUID(),
        source: 'gamification-service'
      }
    }]);
    
    // Award streak bonus
    if (newStreak > 0 && newStreak % 7 === 0) {
      await awardPoints(userId, POINTS.DAILY_STREAK_BONUS * (newStreak / 7), 'STREAK_MILESTONE');
    }
  }
}

async function checkTopicAchievements(userId: string) {
  // Count completed topics
  const completedTopics = await prisma.userProgress.findUnique({
    where: { userId },
    select: { points: true }
  });
  
  // Could check for achievements like "Complete 10 topics", etc.
  // For now, just log
  logger.info(`Checking topic achievements for user ${userId}`);
}

async function checkTestAchievements(userId: string, score: number, percentile: number) {
  // Check for perfect score
  if (score === 100) {
    logger.info(`User ${userId} achieved perfect score!`);
    // Could unlock achievement here
  }
  
  // Check for top performer
  if (percentile >= 95) {
    logger.info(`User ${userId} in top 5%!`);
    // Could unlock achievement here
  }
}

function calculateLevel(points: number): number {
  // Simple level calculation: 100 points per level
  return Math.floor(points / 100) + 1;
}
