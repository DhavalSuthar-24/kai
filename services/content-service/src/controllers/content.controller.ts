import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, type AuthRequest, UnauthorizedError, NotFoundError } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';
import { createLogger } from '@shared/index.ts';
import { videoQueue } from '../workers/video-worker.ts';

const logger = createLogger('content-controller');

export const createCapture = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, type, content, source, tags } = req.body;

  const capture = await prisma.capture.create({
    data: {
      userId,
      type,
      content,
      source,
      tags: tags ? {
        connectOrCreate: tags.map((tag: string) => ({
          where: { userId_name: { userId, name: tag } },
          create: { userId, name: tag }
        }))
      } : undefined
    },
    include: { tags: true }
  });

  // Trigger video processing if type is VIDEO
  if (type === 'VIDEO') {
    try {
      await videoQueue.add('process-video', {
        captureId: capture.id,
        userId: capture.userId,
        content: capture.content
      });
      logger.info(`Queued video processing for capture ${capture.id}`);
    } catch (error) {
      logger.error('Failed to queue video processing', error);
    }
  }

  // Publish event
  try {
    await kafkaClient.send('content-events', [{
        type: 'CONTENT_CAPTURED',
        data: {
            id: capture.id,
            userId: capture.userId,
            type: capture.type,
            content: capture.content,
            source: capture.source,
            createdAt: capture.createdAt
        }
    }]);
  } catch (error) {
    logger.error('Failed to publish CONTENT_CAPTURED event', error);
  }

  res.status(201).json(successResponse(capture, 'Content captured successfully'));
});

import type { PaginationRequest } from '@shared/index.ts';

export const getCaptures = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    search,
    type,
    status,
    aiProcessed,
    startDate,
    endDate,
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const { page, limit, skip } = (req as any).pagination || { page: 1, limit: 20, skip: 0 };

  const where: any = { userId };

  if (search) {
    where.OR = [
      { content: { contains: search as string, mode: 'insensitive' } },
      { extractedText: { contains: search as string, mode: 'insensitive' } },
      { source: { contains: search as string, mode: 'insensitive' } },
      { tags: { some: { name: { contains: search as string, mode: 'insensitive' } } } }
    ];
  }

  if (type) where.type = type;
  if (status) where.status = status;
  if (aiProcessed) where.aiProcessed = aiProcessed === 'true';
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  if (tags) {
    const tagList = (tags as string).split(',');
    where.tags = {
      some: {
        name: { in: tagList }
      }
    };
  }

  const [captures, total] = await Promise.all([
    prisma.capture.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy as string]: sortOrder },
      include: { tags: true }
    }),
    prisma.capture.count({ where }),
  ]);

  res.status(200).json(successResponse({
    data: captures,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  }, 'Captures retrieved successfully'));
});

export const getSearchSuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const { query, field = 'source' } = req.query;

  if (!query || String(query).length < 2) {
    return res.status(200).json(successResponse([], 'Query too short'));
  }

  // Simple suggestion based on distinct values or simple contains
  // For 'source', we can find distinct sources matching the query
  // This is a bit expensive on large datasets without specific optimization, 
  // but for now we can use findMany with distinct or group by.
  // Prisma distinct is client-side filtering for some DBs, but mostly server-side.
  
  const suggestions = await prisma.capture.findMany({
    where: {
      userId,
      [field as string]: { contains: query as string, mode: 'insensitive' },
    },
    select: { [field as string]: true },
    distinct: [field as any], // Cast to any to avoid TS issues with dynamic field
    take: 10,
  });

  const results = suggestions
    .map((s: any) => s[field as string])
    .filter((v: any) => v !== null && v !== undefined);

  res.status(200).json(successResponse(results, 'Suggestions retrieved successfully'));
});

export const deleteCapture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Standard delete, middleware handles soft delete
  // We use deleteMany to ensure userId check works with the middleware transformation
  const result = await prisma.capture.deleteMany({ 
    where: { id, userId } 
  });
  
  if (result.count === 0) {
    throw new NotFoundError('Capture not found');
  }

  res.status(200).json(successResponse(null, 'Capture deleted successfully'));
});

export const archiveCapture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const result = await prisma.capture.updateMany({
    where: { id, userId },
    data: { archivedAt: new Date() }
  });

  if (result.count === 0) {
    throw new NotFoundError('Capture not found');
  }

  res.status(200).json(successResponse(null, 'Capture archived successfully'));
});

export const restoreCapture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  // Restore from soft delete
  const result = await prisma.capture.updateMany({
    where: { 
      id, 
      userId,
      deletedAt: { not: null } 
    },
    data: { deletedAt: null, archivedAt: null }
  });

  if (result.count === 0) {
    throw new NotFoundError('Capture not found or not deleted');
  }

  res.status(200).json(successResponse(null, 'Capture restored successfully'));
});

export const addTags = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tags } = req.body;
  const userId = req.user!.id;

  if (!tags || !Array.isArray(tags)) {
    throw new Error('Tags must be an array of strings');
  }

  const capture = await prisma.capture.findUnique({ where: { id } });
  if (!capture || capture.userId !== userId) {
    throw new NotFoundError('Capture not found');
  }

  const updatedCapture = await prisma.capture.update({
    where: { id },
    data: {
      tags: {
        connectOrCreate: tags.map((tag: string) => ({
          where: { userId_name: { userId, name: tag } },
          create: { userId, name: tag }
        }))
      }
    },
    include: { tags: true }
  });

  res.status(200).json(successResponse(updatedCapture, 'Tags added successfully'));
});

export const removeTag = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tagName } = req.body;
  const userId = req.user!.id;

  const capture = await prisma.capture.findUnique({ where: { id } });
  if (!capture || capture.userId !== userId) {
    throw new NotFoundError('Capture not found');
  }

  const updatedCapture = await prisma.capture.update({
    where: { id },
    data: {
      tags: {
        disconnect: { userId_name: { userId, name: tagName } }
      }
    },
    include: { tags: true }
  });

  res.status(200).json(successResponse(updatedCapture, 'Tag removed successfully'));
});
