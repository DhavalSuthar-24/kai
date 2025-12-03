import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('learning-consumer');

export const handleLearningEvent = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'CONTENT_PROCESSED') {
      logger.info('Processing CONTENT_PROCESSED event', { contentId: data.contentId });

      await prisma.capture.update({
        where: { id: data.contentId },
        data: { 
          status: 'PROCESSED',
          updatedAt: new Date()
        }
      });

      logger.info('Updated content status to PROCESSED', { contentId: data.contentId });
    }
  } catch (error) {
    logger.error('Error handling learning event', error);
  }
};
