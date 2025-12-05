import { type Response } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, NotFoundError, type AuthRequest, focusModeSchema } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

// POST /focus-modes - Create focus mode
export const createFocusMode = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const data = focusModeSchema.parse(req.body);
  
  const focusMode = await prisma.focusMode.create({
    data: {
      userId,
      ...data,
      blockedApps: JSON.stringify(data.blockedApps),
      allowedApps: JSON.stringify(data.allowedApps)
    }
  });
  
  res.status(201).json(successResponse(focusMode, 'Focus mode created'));
});

// GET /focus-modes - List focus modes
export const getFocusModes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  
  const focusModes = await prisma.focusMode.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  // Parse JSON fields
  const parsed = focusModes.map((fm: any) => ({
    ...fm,
    blockedApps: JSON.parse(fm.blockedApps),
    allowedApps: JSON.parse(fm.allowedApps)
  }));
  
  res.json(successResponse(parsed));
});

// GET /focus-modes/current - Get active focus mode
export const getCurrentFocusMode = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  
  const focusMode = await prisma.focusMode.findFirst({
    where: { userId, isActive: true }
  });
  
  if (!focusMode) {
    res.json(successResponse(null, 'No active focus mode'));
    return;
  }
  
  const parsed = {
    ...focusMode,
    blockedApps: JSON.parse(focusMode.blockedApps),
    allowedApps: JSON.parse(focusMode.allowedApps)
  };
  
  res.json(successResponse(parsed));
});

// PUT /focus-modes/:id/activate - Activate focus mode
export const activateFocusMode = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { id } = req.params;
  
  // Deactivate all other focus modes
  await prisma.focusMode.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, endedAt: new Date() }
  });
  
  // Activate the selected focus mode
  const focusMode = await prisma.focusMode.updateMany({
    where: { id, userId },
    data: {
      isActive: true,
      startedAt: new Date(),
      endedAt: null,
      totalSessions: { increment: 1 }
    }
  });
  
  if (focusMode.count === 0) {
    throw new NotFoundError('Focus mode not found');
  }
  
  // Publish event
  try {
    await kafkaClient.send('learning-events', [{
      type: 'FOCUS_MODE_ACTIVATED',
      data: { userId, focusModeId: id, activatedAt: new Date() }
    }]);
  } catch (error) {
    console.error('Failed to publish FOCUS_MODE_ACTIVATED event', error);
  }
  
  res.json(successResponse(focusMode, 'Focus mode activated'));
});

// PUT /focus-modes/:id - Update focus mode
export const updateFocusMode = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { id } = req.params;
  const data = focusModeSchema.partial().parse(req.body);
  
  const updateData: any = { ...data };
  if (data.blockedApps) updateData.blockedApps = JSON.stringify(data.blockedApps);
  if (data.allowedApps) updateData.allowedApps = JSON.stringify(data.allowedApps);
  
  const focusMode = await prisma.focusMode.updateMany({
    where: { id, userId },
    data: updateData
  });
  
  if (focusMode.count === 0) {
    throw new NotFoundError('Focus mode not found');
  }
  
  res.json(successResponse(focusMode, 'Focus mode updated'));
});

// DELETE /focus-modes/:id - Delete focus mode
export const deleteFocusMode = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const { id } = req.params;
  
  const focusMode = await prisma.focusMode.deleteMany({
    where: { id, userId }
  });
  
  if (focusMode.count === 0) {
    throw new NotFoundError('Focus mode not found');
  }
  
  res.json(successResponse(null, 'Focus mode deleted'));
});
