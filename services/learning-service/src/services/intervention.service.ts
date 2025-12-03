import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';
import { addMinutes } from 'date-fns';

const logger = createLogger('intervention-service');

export class InterventionService {
  
  async triggerIntervention(userId: string, eventData: any) {
    try {
      logger.info(`Attempting intervention for user ${userId}`);

      // 1. Check for active/pending interventions (avoid spam)
      const activeIntervention = await prisma.intervention.findFirst({
        where: {
          userId,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });

      if (activeIntervention) {
        logger.info(`User ${userId} already has an active intervention`);
        return;
      }

      // 2. Select Content Strategy
      // Priority 1: Due Flashcards
      // Fetch user's topics first since relation might not be configured
      const userTopics = await prisma.topic.findMany({
        where: { userId },
        select: { id: true }
      });
      const topicIds = userTopics.map(t => t.id);

      const dueFlashcard = await prisma.flashcard.findFirst({
        where: {
          topicId: { in: topicIds },
          nextReview: { lte: new Date() }
        }
      });

      let contentType = 'TOPIC';
      let contentId = null;
      let contentPreview = 'Time to learn something new!';

      if (dueFlashcard) {
        contentType = 'FLASHCARD';
        contentId = dueFlashcard.id;
        contentPreview = `Review: ${dueFlashcard.front}`;
      } else {
        // Priority 2: Random Topic
        const randomTopic = await prisma.topic.findFirst({
          where: { userId },
          take: 1,
          skip: Math.floor(Math.random() * 5) // Simple randomizer
        });
        
        if (randomTopic) {
          contentId = randomTopic.id;
          contentPreview = `Explore: ${randomTopic.name}`;
        }
      }

      // 3. Create Intervention
      const intervention = await prisma.intervention.create({
        data: {
          userId,
          triggerReason: 'DOOMSCROLL_DETECTED',
          detectedApp: eventData.appName || 'Unknown App',
          contentType,
          contentId: contentId || 'generic',
          contentPreview,
          expiresAt: addMinutes(new Date(), 5),
          metadata: JSON.stringify(eventData)
        }
      });

      logger.info(`Intervention created: ${intervention.id}`);
      return intervention;

    } catch (error) {
      logger.error('Error triggering intervention', error);
    }
  }

  async handleResponse(interventionId: string, userId: string, response: 'ACCEPTED' | 'DISMISSED') {
    return await prisma.intervention.update({
      where: { id: interventionId, userId },
      data: {
        status: response,
        respondedAt: new Date()
      }
    });
  }
}

export const interventionService = new InterventionService();
