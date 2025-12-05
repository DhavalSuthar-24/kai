import { type Request, type Response } from 'express';
import prisma from '../prisma';
import { successResponse, asyncHandler, BadRequestError, type AuthRequest, NotFoundError } from '@shared/index.ts';
import type { PaginationRequest } from '@shared/index.ts';
import kafkaClient from '../kafka';
import { SpacedRepetition } from '../services/spaced-repetition';

const srs = new SpacedRepetition();

export const getTopics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const { page, limit, skip } = (req as any).pagination || { page: 1, limit: 20, skip: 0 };

  const where: any = { userId };

  if (search) {
    where.name = { search: String(search).split(' ').join(' & ') };
  }

  const [topics, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
      include: {
        _count: {
          select: { flashcards: true }
        }
      }
    }),
    prisma.topic.count({ where }),
  ]);

  res.status(200).json(successResponse({
    topics,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }, 'Topics retrieved successfully'));
});

export const getFlashcards = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { topicId, search, dueOnly, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const { page, limit, skip } = (req as any).pagination || { page: 1, limit: 20, skip: 0 };

  const where: any = { 
    topic: { userId } // Ensure user owns the flashcards via topic
  };

  if (topicId) {
    where.topicId = topicId;
  }

  if (search) {
    where.OR = [
      { front: { search: String(search).split(' ').join(' & ') } },
      { back: { search: String(search).split(' ').join(' & ') } },
    ];
  }

  if (dueOnly === 'true') {
    where.nextReview = { lte: new Date() };
  }

  const [flashcards, total] = await Promise.all([
    prisma.flashcard.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
      include: { topic: { select: { name: true } } }
    }),
    prisma.flashcard.count({ where }),
  ]);

  res.status(200).json(successResponse({
    flashcards,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }, 'Flashcards retrieved successfully'));
});

export const createTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const userId = req.user!.id;
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

export const completeTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { topicId } = req.body;
    const userId = req.user!.id;
    
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

// Topic Management
export const deleteTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const result = await prisma.topic.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new NotFoundError('Topic not found');

  res.status(200).json(successResponse(null, 'Topic deleted successfully'));
});

export const archiveTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const result = await prisma.topic.updateMany({
    where: { id, userId },
    data: { archivedAt: new Date() }
  });
  if (result.count === 0) throw new NotFoundError('Topic not found');

  res.status(200).json(successResponse(null, 'Topic archived successfully'));
});

export const restoreTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const result = await prisma.topic.updateMany({
    where: { id, userId, deletedAt: { not: null } },
    data: { deletedAt: null, archivedAt: null }
  });
  if (result.count === 0) throw new NotFoundError('Topic not found or not deleted');

  res.status(200).json(successResponse(null, 'Topic restored successfully'));
});

// Flashcard Management
export const deleteFlashcard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Ensure user owns the flashcard via topic
  const flashcard = await prisma.flashcard.findFirst({
    where: { id, topic: { userId } }
  });
  if (!flashcard) throw new NotFoundError('Flashcard not found');

  await prisma.flashcard.delete({ where: { id } });
  res.status(200).json(successResponse(null, 'Flashcard deleted successfully'));
});

export const archiveFlashcard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const flashcard = await prisma.flashcard.findFirst({
    where: { id, topic: { userId } }
  });
  if (!flashcard) throw new NotFoundError('Flashcard not found');

  await prisma.flashcard.updateMany({
    where: { id },
    data: { archivedAt: new Date() }
  });
  res.status(200).json(successResponse(null, 'Flashcard archived successfully'));
});

export const restoreFlashcard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // For restore, we need to find it even if deleted.
  // But we also need to check ownership.
  // Since topic might not be deleted, we can check topic ownership.
  // But if topic is deleted, we can't easily check ownership without finding topic first.
  // Assuming topic is not deleted for now.
  
  const flashcard = await prisma.flashcard.findFirst({
    where: { id, deletedAt: { not: null }, topic: { userId } }
  });
  if (!flashcard) throw new NotFoundError('Flashcard not found or not deleted');

  await prisma.flashcard.updateMany({
    where: { id },
    data: { deletedAt: null, archivedAt: null }
  });
  res.status(200).json(successResponse(null, 'Flashcard restored successfully'));
});
