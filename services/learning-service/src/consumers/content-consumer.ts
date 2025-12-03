import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';
import { ContentProcessor } from '../services/content-processor';

const logger = createLogger('content-consumer');
const contentProcessor = new ContentProcessor();

export const handleContentCaptured = async (message: any) => {
  try {
    const { type, data } = message;

    if (type === 'CONTENT_CAPTURED') {
      logger.info('Processing CONTENT_CAPTURED event', { contentId: data.id });

      // Use LLM to process content
      const generatedData = await contentProcessor.process(data.content);

      // Create Topic
      const topic = await prisma.topic.create({
        data: {
          name: generatedData.name,
          userId: data.userId,
        },
      });

      logger.info('Created topic from content', { topicId: topic.id, name: topic.name });

      // Create Flashcards
      if (generatedData.flashcards && generatedData.flashcards.length > 0) {
        // LibSQL doesn't support createMany, so we create individually
        await Promise.all(
          generatedData.flashcards.map(fc =>
            prisma.flashcard.create({
              data: {
                front: fc.front,
                back: fc.back,
                topicId: topic.id,
                nextReview: new Date(),
                interval: 0,
                easeFactor: 2.5
              }
            })
          )
        );
        logger.info('Created flashcards for topic', { count: generatedData.flashcards.length });
      }

      // Publish CONTENT_PROCESSED event
      try {
        await import('../kafka').then(k => k.default.send('learning-events', [{
            type: 'CONTENT_PROCESSED',
            data: {
                contentId: data.id,
                topicId: topic.id,
                status: 'PROCESSED',
                timestamp: new Date()
            }
        }]));
        logger.info('Published CONTENT_PROCESSED event', { contentId: data.id });
      } catch (error) {
        logger.error('Failed to publish CONTENT_PROCESSED event', error);
      }
    }
  } catch (error) {
    logger.error('Error handling content event', error);
  }
};
