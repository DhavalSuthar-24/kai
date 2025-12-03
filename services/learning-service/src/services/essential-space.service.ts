import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { getHours } from 'date-fns';

const logger = createLogger('essential-space-service');

export class EssentialSpaceService {
  
  async refreshSpace(userId: string) {
    try {
      logger.info(`Refreshing Essential Space for user ${userId}`);

      // 1. Clear existing auto-generated items (keep manual ones if any)
      await prisma.essentialSpaceItem.deleteMany({
        where: { userId, itemType: { in: ['FLASHCARD', 'TOPIC'] } }
      });

      const currentHour = getHours(new Date());
      const context = this.getTimeContext(currentHour);

      // 2. Fetch Candidates
      // A. Due Flashcards
      const userTopics = await prisma.topic.findMany({
        where: { userId },
        select: { id: true, name: true }
      });
      const topicMap = new Map(userTopics.map(t => [t.id, t.name]));
      const topicIds = userTopics.map(t => t.id);

      const dueFlashcards = await prisma.flashcard.findMany({
        where: {
          topicId: { in: topicIds },
          nextReview: { lte: new Date() }
        },
        take: 5
      });

      // B. Recent Topics
      const recentTopics = await prisma.topic.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 3
      });

      // 3. Score and Create Items
      const itemsToCreate = [];

      for (const card of dueFlashcards) {
        const score = this.calculateScore('FLASHCARD', 0.8, context);
        itemsToCreate.push({
          userId,
          itemType: 'FLASHCARD',
          itemId: card.id,
          title: `Review: ${topicMap.get(card.topicId) || 'Flashcard'}`,
          description: card.front,
          priority: 'IMPORTANT',
          score
        });
      }

      for (const topic of recentTopics) {
        const score = this.calculateScore('TOPIC', 0.6, context);
        itemsToCreate.push({
          userId,
          itemType: 'TOPIC',
          itemId: topic.id,
          title: `Continue: ${topic.name}`,
          description: 'Pick up where you left off',
          priority: 'NICE_TO_HAVE',
          score
        });
      }

      // 4. Bulk Insert
      if (itemsToCreate.length > 0) {
        await prisma.essentialSpaceItem.createMany({
          data: itemsToCreate
        });
      }

      logger.info(`Generated ${itemsToCreate.length} items for Essential Space`);

    } catch (error) {
      logger.error('Error refreshing Essential Space', error);
    }
  }

  async getItems(userId: string) {
    return await prisma.essentialSpaceItem.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: 10
    });
  }

  private getTimeContext(hour: number): 'MORNING' | 'WORK' | 'EVENING' | 'NIGHT' {
    if (hour >= 5 && hour < 10) return 'MORNING';
    if (hour >= 10 && hour < 18) return 'WORK';
    if (hour >= 18 && hour < 22) return 'EVENING';
    return 'NIGHT';
  }

  private calculateScore(type: string, baseScore: number, context: string): number {
    let multiplier = 1.0;

    switch (context) {
      case 'MORNING':
        if (type === 'GOAL') multiplier = 1.5;
        if (type === 'FLASHCARD') multiplier = 1.2;
        break;
      case 'WORK':
        if (type === 'TOPIC') multiplier = 1.3;
        if (type === 'CAPTURE') multiplier = 1.1;
        break;
      case 'EVENING':
        if (type === 'CAPTURE') multiplier = 1.4; // Reading
        if (type === 'MEMORY') multiplier = 1.3;
        break;
    }

    return Math.min(baseScore * multiplier, 1.0);
  }
}

export const essentialSpaceService = new EssentialSpaceService();
