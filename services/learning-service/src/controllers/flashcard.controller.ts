import type { Request, Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { prisma } from '../prisma';
import { successResponse, errorResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import kafkaClient from '../kafka';

// Spaced Repetition Algorithm (SM-2)
interface ReviewResult {
  quality: number; // 0-5 rating
  flashcardId: string;
}

function calculateNextReview(quality: number, easeFactor: number, interval: number): {
  newEaseFactor: number;
  newInterval: number;
  nextReview: Date;
} {
  // SM-2 Algorithm
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }
  
  let newInterval: number;
  if (quality < 3) {
    // Failed - reset to 1 day
    newInterval = 1;
  } else {
    if (interval === 0) {
      newInterval = 1;
    } else if (interval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  return { newEaseFactor, newInterval, nextReview };
}

// Get due flashcards
export const getDueFlashcards = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { topicId, limit = 20 } = req.query;

  const where: any = {
    userId,
    deletedAt: null,
    nextReview: {
      lte: new Date()
    }
  };

  if (topicId) {
    where.topicId = topicId as string;
  }

  const flashcards = await prisma.flashcard.findMany({
    where,
    take: parseInt(limit as string),
    orderBy: { nextReview: 'asc' },
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true
        }
      }
    }
  });

  res.json(successResponse({
    flashcards,
    count: flashcards.length
  }, 'Due flashcards retrieved successfully'));
});

// Review flashcard
export const reviewFlashcard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { id } = req.params;
  const { quality } = req.body;

  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json(errorResponse('Quality must be between 0 and 5'));
  }

  // Get flashcard
  const flashcard = await prisma.flashcard.findFirst({
    where: {
      id: id as string,
      userId,
      deletedAt: null
    }
  });

  if (!flashcard) {
    return res.status(404).json(errorResponse('Flashcard not found'));
  }

  // Calculate next review
  const { newEaseFactor, newInterval, nextReview } = calculateNextReview(
    quality,
    flashcard.easeFactor,
    flashcard.interval
  );

  // Update flashcard
  const updatedFlashcard = await prisma.flashcard.update({
    where: { id },
    data: {
      easeFactor: newEaseFactor,
      interval: newInterval,
      nextReview,
      difficulty: quality < 3 ? 'HARD' : quality > 4 ? 'EASY' : 'NORMAL'
    }
  });

  // Create review log
  await prisma.reviewLog.create({
    data: {
      userId,
      flashcardId: id, // id is string from params
      topicId: flashcard.topicId,
      quality,
      easeFactor: newEaseFactor,
      interval: newInterval,
      reviewedAt: new Date()
    }
  });

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
      flashcardsReviewed: 1,
      studyTime: 0
    },
    update: {
      flashcardsReviewed: {
        increment: 1
      }
    }
  });

  // Publish flashcard reviewed event
  await kafkaClient.send('learning-events', [{
    type: 'FLASHCARD_REVIEWED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      flashcardId: id,
      userId,
      topicId: flashcard.topicId,
      quality,
      nextReview: nextReview.toISOString()
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'learning-service'
    }
  }]);

  res.json(successResponse({
    flashcard: updatedFlashcard,
    nextReview,
    interval: newInterval
  }, 'Flashcard reviewed successfully'));
});

// Get flashcard statistics
export const getFlashcardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const totalFlashcards = await prisma.flashcard.count({
    where: { userId, deletedAt: null }
  });

  const dueFlashcards = await prisma.flashcard.count({
    where: {
      userId,
      deletedAt: null,
      nextReview: { lte: new Date() }
    }
  });

  const reviewedToday = await prisma.reviewLog.count({
    where: {
      userId,
      reviewedAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  const masteryDistribution = await prisma.flashcard.groupBy({
    by: ['difficulty'],
    where: { userId, deletedAt: null },
    _count: true
  });

  res.json(successResponse({
    totalFlashcards,
    dueFlashcards,
    reviewedToday,
    masteryDistribution: masteryDistribution.reduce((acc, item) => {
      acc[item.difficulty] = item._count;
      return acc;
    }, {} as Record<string, number>)
  }, 'Flashcard statistics retrieved successfully'));
});

// Create flashcard
export const createFlashcard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { topicId, front, back } = req.body;

  if (!topicId || !front || !back) {
    return res.status(400).json(errorResponse('Topic ID, front, and back are required'));
  }

  // Verify topic ownership
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId }
  });

  if (!topic) {
    return res.status(404).json(errorResponse('Topic not found'));
  }

  const flashcard = await prisma.flashcard.create({
    data: {
      userId,
      topicId,
      front: front.trim(),
      back: back.trim(),
      nextReview: new Date(),
      interval: 0,
      easeFactor: 2.5,
      difficulty: 'NORMAL'
    }
  });

  res.status(201).json(successResponse(flashcard, 'Flashcard created successfully'));
});
