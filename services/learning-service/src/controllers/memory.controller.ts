import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { successResponse, errorResponse, asyncHandler } from '@shared/index.ts';
import { memoryService } from '../services/memory.service.ts';

export const getMemoryFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const feed = await memoryService.getFeed(userId);
  res.json(successResponse(feed, 'Memory feed retrieved'));
});

export const markMemoryViewed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const { id } = req.params;
  if (!id) {
    res.status(400).json(errorResponse('Missing memory ID', 400));
    return;
  }

  const updated = await memoryService.markAsViewed(id, userId as string);
  
  res.json(successResponse(updated, 'Memory marked as viewed'));
});
