import type { Request, Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { prisma } from '../prisma';
import { successResponse, errorResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import kafkaClient from '../kafka';

// Get all topics for user
export const getTopics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const topics = await prisma.topic.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          flashcards: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(successResponse(topics, 'Topics retrieved successfully'));
});

// Get single topic
export const getTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { id } = req.params;

  const topic = await prisma.topic.findFirst({
    where: {
      id,
      userId
    },
    include: {
      flashcards: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          flashcards: true
        }
      }
    }
  });

  if (!topic) {
    return res.status(404).json(errorResponse('Topic not found'));
  }

  res.json(successResponse(topic, 'Topic retrieved successfully'));
});

// Create topic
export const createTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { name, parentId, color, icon } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json(errorResponse('Topic name is required'));
  }

  // Check if topic with same name already exists
  const existing = await prisma.topic.findFirst({
    where: {
      userId,
      name: {
        equals: name.trim(),
        mode: 'insensitive'
      }
    }
  });

  if (existing) {
    return res.status(400).json(errorResponse('Topic with this name already exists'));
  }

  const topic = await prisma.topic.create({
    data: {
      userId,
      name: name.trim(),
      parentId: parentId || null,
      color: color || getRandomColor(),
      icon: icon || '📚'
    }
  });

  // Publish topic created event
  await kafkaClient.send('learning-events', [{
    type: 'TOPIC_CREATED',
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      topicId: topic.id,
      userId,
      name: topic.name,
      autoCreated: false
    },
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'learning-service'
    }
  }]);

  res.status(201).json(successResponse(topic, 'Topic created successfully'));
});

// Update topic
export const updateTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { id } = req.params;
  const { name, color, icon, parentId } = req.body;

  // Verify ownership
  const existing = await prisma.topic.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return res.status(404).json(errorResponse('Topic not found'));
  }

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(color && { color }),
      ...(icon && { icon }),
      ...(parentId !== undefined && { parentId })
    }
  });

  res.json(successResponse(topic, 'Topic updated successfully'));
});

// Delete topic
export const deleteTopic = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { id } = req.params;

  // Verify ownership
  const existing = await prisma.topic.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return res.status(404).json(errorResponse('Topic not found'));
  }

  // Soft delete - mark as deleted
  await prisma.topic.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  res.json(successResponse(null, 'Topic deleted successfully'));
});

// Get topic progress
export const getTopicProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const { id } = req.params;

  // Verify ownership
  const topic = await prisma.topic.findFirst({
    where: { id, userId }
  });

  if (!topic) {
    return res.status(404).json(errorResponse('Topic not found'));
  }

  // Get flashcard statistics
  const totalFlashcards = await prisma.flashcard.count({
    where: { topicId: id, deletedAt: null }
  });

  const reviewedFlashcards = await prisma.reviewLog.groupBy({
    by: ['flashcardId'],
    where: {
      topicId: id,
      userId
    }
  });

  const masteryLevels = await prisma.flashcard.groupBy({
    by: ['difficulty'],
    where: { topicId: id, deletedAt: null },
    _count: true
  });

  const progress = {
    topicId: id,
    topicName: topic.name,
    totalFlashcards,
    reviewedFlashcards: reviewedFlashcards.length,
    masteryDistribution: masteryLevels.reduce((acc, level) => {
      acc[level.difficulty] = level._count;
      return acc;
    }, {} as Record<string, number>),
    completionPercentage: totalFlashcards > 0 
      ? Math.round((reviewedFlashcards.length / totalFlashcards) * 100)
      : 0
  };

  res.json(successResponse(progress, 'Topic progress retrieved successfully'));
});

// Helper function
function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
  return colors[Math.floor(Math.random() * colors.length)] as string;
}
