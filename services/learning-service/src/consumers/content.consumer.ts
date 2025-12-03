import { createLogger } from '@shared/index.ts';
import { interventionService } from '../services/intervention.service.ts';
import prisma from '../prisma.ts';

const logger = createLogger('content-consumer');

export const handleContentEvent = async (message: any) => {
  try {
    logger.info('Received content event', { type: message.type });

    switch (message.type) {
      case 'DOOMSCROLL_DETECTED':
        await interventionService.triggerIntervention(message.payload.userId, message.payload);
        break;
        
      case 'CONTENT_PROCESSED':
        // If content is important, add to Essential Space
        const { aiAnalysis, captureId, userId } = message.payload;
        if (aiAnalysis && aiAnalysis.importanceScore > 0.7) {
           await prisma.essentialSpaceItem.create({
             data: {
               userId,
               itemType: 'CAPTURE',
               itemId: captureId,
               title: `New Capture: ${aiAnalysis.category}`,
               description: aiAnalysis.summary || 'Check this out',
               priority: 'IMPORTANT',
               score: aiAnalysis.importanceScore
             }
           });
           logger.info(`Added high-importance capture to Essential Space: ${captureId}`);
        }
        break;

      default:
        logger.warn(`Unknown event type: ${message.type}`);
    }
  } catch (error) {
    logger.error('Error handling content event', error);
  }
};
