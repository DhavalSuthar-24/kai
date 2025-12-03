import prisma from '../prisma';
import kafkaClient from '../kafka'; // Assuming kafkaClient is exported from kafka.ts or similar
import { createLogger } from '@shared/index.ts';

const logger = createLogger('review-scheduler');

export const checkDueReviews = async () => {
  logger.info('Running review check...');
  
  const now = new Date();
  
  const dueFlashcards = await prisma.flashcard.findMany({
      where: {
          nextReview: { lte: now }
      },
      select: {
          id: true,
          topicId: true
      }
  });
  
  // Get unique topic IDs and fetch their user IDs
  const topicIds = [...new Set(dueFlashcards.map(fc => fc.topicId))];
  const topics = await prisma.topic.findMany({
      where: {
          id: { in: topicIds }
      },
      select: {
          id: true,
          userId: true
      }
  });
  
  const topicMap = new Map(topics.map(t => [t.id, t.userId]));
  
  // Group by user
  const userCounts: Record<string, number> = {};
  dueFlashcards.forEach((fc) => {
      const userId = topicMap.get(fc.topicId);
      if (userId) {
          userCounts[userId] = (userCounts[userId] || 0) + 1;
      }
  });
  
  for (const [userId, count] of Object.entries(userCounts)) {
      if (count > 0) {
          logger.info(`User ${userId} has ${count} reviews due`);
          
          await import('../kafka').then(k => k.default.send('reminder-events', [{
              type: 'FLASHCARD_DUE',
              data: {
                  userId,
                  count,
                  timestamp: new Date()
              }
          }]));
      }
  }
};

export const startReviewScheduler = () => {
    setInterval(checkDueReviews, 60 * 60 * 1000); // Every hour
    // Run once on startup
    checkDueReviews();
};
