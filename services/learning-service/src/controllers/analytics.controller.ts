```typescript
import { type Request, type Response } from 'express';
import { asyncHandler, successResponse, type AuthRequest, UnauthorizedError, errorResponse } from '@shared/index.ts';
import { AnalyticsService } from '../services/analytics.service';
import { AdvancedAnalyticsService } from '../services/advanced-analytics.service';
import axios from 'axios';

const analyticsService = new AnalyticsService();
const advancedAnalyticsService = new AdvancedAnalyticsService(); // Added advancedAnalyticsService instance
const GAMIFICATION_SERVICE_URL = process.env.GAMIFICATION_SERVICE_URL || 'http://localhost:3004';

export const getOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const overview = await analyticsService.getOverview(userId);
  
  // Enreich with Streak from Gamification Service (if not already handled or needed)
  try {
      const response = await axios.get(`${GAMIFICATION_SERVICE_URL}/gamification/progress/${userId}`, { timeout: 2000 });
      overview.activeStreak = response.data.data?.streak || 0;
  } catch (err) {
      // Ignore
  }

  res.json(successResponse(overview, 'Overview retrieved successfully'));
});

export const getFlashcardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const stats = await analyticsService.getFlashcardStats(userId);
  res.json(successResponse(stats, 'Flashcard stats retrieved successfully'));
});

export const getTopicProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const progress = await analyticsService.getTopicProgress(userId);
  res.json(successResponse(progress, 'Topic progress retrieved successfully'));
});

export const getStudyTime = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('User not authenticated');
  const { period } = req.query;

  const data = await analyticsService.getStudyTime(userId, period as string);
  res.json(successResponse(data, 'Study time retrieved successfully'));
});

export const getReviewAccuracy = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const accuracy = await analyticsService.getReviewAccuracy(userId);
  res.json(successResponse({ averageAccuracy: accuracy }, 'Review accuracy retrieved successfully'));
});

