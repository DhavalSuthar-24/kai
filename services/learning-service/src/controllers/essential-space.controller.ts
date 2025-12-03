import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { successResponse, errorResponse, asyncHandler } from '@shared/index.ts';
import { essentialSpaceService } from '../services/essential-space.service.ts';

export const getEssentialSpace = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const items = await essentialSpaceService.getItems(userId);
  res.json(successResponse(items, 'Essential Space retrieved'));
});

export const refreshEssentialSpace = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  await essentialSpaceService.refreshSpace(userId);
  const items = await essentialSpaceService.getItems(userId);
  
  res.json(successResponse(items, 'Essential Space refreshed'));
});
