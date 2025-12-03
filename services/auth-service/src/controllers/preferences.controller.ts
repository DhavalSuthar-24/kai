import { type Response } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, type AuthRequest } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';
import { userPreferencesSchema } from '../validation/validation.ts';

// GET /preferences - Retrieve user preferences
export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId }
  });
  
  // Create default preferences if none exist
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: { userId }
    });
  }
  
  res.json(successResponse(preferences));
});

// POST /preferences - Set/update user preferences
export const setPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = req.user.id;
  const data = userPreferencesSchema.parse(req.body);
  
  const preferences = await prisma.userPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
  
  // Publish event
  try {
    await kafkaClient.send('user-events', [{
      type: 'USER_PREFERENCES_UPDATED',
      data: { userId, preferences, updatedAt: new Date() }
    }]);
  } catch (error) {
    console.error('Failed to publish USER_PREFERENCES_UPDATED event', error);
  }
  
  res.json(successResponse(preferences, 'Preferences updated'));
});
