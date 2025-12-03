import { prisma } from '../prisma';
import { subDays, startOfWeek, endOfWeek } from 'date-fns';
import { createLogger } from '@shared/index';

const logger = createLogger('insights-service');

export async function generateWeeklyInsights(userId: string): Promise<void> {
  logger.info(`Generating weekly insights for user ${userId}`);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Aggregate stats for the week
  const stats = await aggregateWeeklyStats(userId, weekStart, weekEnd);

  // Generate natural language summary
  const summary = generateSummary(stats);

  // Save to database
  await prisma.memoryInsight.create({
    data: {
      userId,
      memoryType: 'WEEKLY_DIGEST',
      title: 'Your Weekly Kaizen Report',
      description: summary,
      startDate: weekStart,
      endDate: weekEnd,
      relatedIds: JSON.stringify(stats)
    }
  });

  logger.info(`Generated weekly insights for user ${userId}`);
}

async function aggregateWeeklyStats(userId: string, weekStart: Date, weekEnd: Date) {
  // Get user's topics first
  const userTopics = await prisma.topic.findMany({
    where: { userId },
    select: { id: true }
  });
  
  const topicIds = userTopics.map(t => t.id);
  
  // Flashcards reviewed this week
  const flashcardsReviewed = await prisma.flashcard.count({
    where: {
      topicId: { in: topicIds },
      updatedAt: {
        gte: weekStart,
        lte: weekEnd
      }
    }
  });

  // Topics studied
  const topicsStudied = await prisma.topic.count({
    where: {
      userId,
      updatedAt: {
        gte: weekStart,
        lte: weekEnd
      }
    }
  });

  // Interventions (doomscroll detection)
  const interventions = await prisma.intervention.count({
    where: {
      userId,
      triggeredAt: {
        gte: weekStart,
        lte: weekEnd
      }
    }
  });

  const interventionsAccepted = await prisma.intervention.count({
    where: {
      userId,
      status: 'ACCEPTED',
      triggeredAt: {
        gte: weekStart,
        lte: weekEnd
      }
    }
  });

  // Calculate doomscroll reduction (mock calculation)
  const doomscrollReduction = interventionsAccepted > 0 
    ? Math.round((interventionsAccepted / interventions) * 100)
    : 0;

  return {
    flashcardsReviewed,
    topicsStudied,
    interventions,
    interventionsAccepted,
    doomscrollReduction
  };
}

function generateSummary(stats: any): string {
  const parts: string[] = [];

  if (stats.doomscrollReduction > 0) {
    parts.push(`You reduced doomscrolling by ${stats.doomscrollReduction}% this week!`);
  }

  if (stats.flashcardsReviewed > 0) {
    parts.push(`You reviewed ${stats.flashcardsReviewed} flashcard${stats.flashcardsReviewed > 1 ? 's' : ''}.`);
  }

  if (stats.topicsStudied > 0) {
    parts.push(`You studied ${stats.topicsStudied} topic${stats.topicsStudied > 1 ? 's' : ''}.`);
  }

  if (stats.interventionsAccepted > 0) {
    parts.push(`You accepted ${stats.interventionsAccepted} learning intervention${stats.interventionsAccepted > 1 ? 's' : ''}.`);
  }

  if (parts.length === 0) {
    return "Start your learning journey this week! Create topics and review flashcards.";
  }

  return parts.join(' ');
}

export async function getLatestWeeklyInsights(userId: string) {
  const insights = await prisma.memoryInsight.findFirst({
    where: {
      userId,
      memoryType: 'WEEKLY_DIGEST'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return insights;
}
