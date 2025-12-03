import { type Request, type Response } from 'express';
import prisma from '../prisma';
import { successResponse, asyncHandler, BadRequestError } from '@shared/index.ts';
import kafkaClient from '../kafka';
import { SpacedRepetition } from '../services/spaced-repetition';

const srs = new SpacedRepetition();

export const createTopic = asyncHandler(async (req: Request, res: Response) => {
  const { name, userId } = req.body;
  const topic = await prisma.topic.create({
    data: { name, userId },
  });
  res.status(201).json(successResponse(topic, 'Topic created successfully'));
});

export const createFlashcard = asyncHandler(async (req: Request, res: Response) => {
  const { front, back, topicId } = req.body;
  const flashcard = await prisma.flashcard.create({
    data: { 
        front, 
        back, 
        topicId,
        nextReview: new Date(),
        interval: 0,
        easeFactor: 2.5
    },
  });
  res.status(201).json(successResponse(flashcard, 'Flashcard created successfully'));
});

export const reviewFlashcard = asyncHandler(async (req: Request, res: Response) => {
    const { flashcardId, quality } = req.body; // quality: 0-5

    if (quality < 0 || quality > 5) {
        throw new BadRequestError('Quality must be between 0 and 5');
    }

    const flashcard = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!flashcard) {
        throw new BadRequestError('Flashcard not found');
    }

    const result = srs.calculate(flashcard.interval, flashcard.easeFactor, quality);

    const updatedFlashcard = await prisma.flashcard.update({
        where: { id: flashcardId },
        data: {
            nextReview: result.nextReview,
            interval: result.interval,
            easeFactor: result.easeFactor
        }
    });

    // Publish FLASHCARD_REVIEWED event
    try {
      // We need userId here. Ideally it should be in req.user from auth middleware.
      // For now, we'll fetch it from the topic associated with the flashcard.
      const topic = await prisma.topic.findUnique({ where: { id: flashcard.topicId } });
      
      if (topic) {
          await kafkaClient.send('learning-events', [{
              type: 'FLASHCARD_REVIEWED',
              data: {
                  userId: topic.userId,
                  flashcardId: flashcard.id,
                  quality,
                  timestamp: new Date()
              }
          }]);
      }
    } catch (error) {
      console.error('Failed to publish FLASHCARD_REVIEWED event', error);
    }

    res.status(200).json(successResponse(updatedFlashcard, 'Flashcard reviewed successfully'));
});

export const completeTopic = asyncHandler(async (req: Request, res: Response) => {
    const { topicId, userId } = req.body;
    
    // Check if topic exists
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
        throw new BadRequestError('Topic not found');
    }
    
    try {
      await kafkaClient.send('learning-events', [{
          type: 'TOPIC_COMPLETED',
          data: { topicId, userId, timestamp: new Date() }
      }]);
    } catch (error) {
      console.error('Failed to publish TOPIC_COMPLETED event', error);
    }

    res.status(200).json(successResponse({ topicId, userId }, 'Topic completed and event published'));
});
