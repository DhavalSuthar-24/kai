import { type Request, type Response } from 'express';
import prisma from '../prisma.ts';
import { successResponse, asyncHandler, BadRequestError } from '@shared/index.ts';

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const topUsers = await prisma.userProgress.findMany({
    take: 10,
    orderBy: { points: 'desc' },
  });
  res.status(200).json(successResponse(topUsers));
});

export const getSocialShare = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const userProgress = await prisma.userProgress.findUnique({
        where: { userId }
    });

    if (!userProgress) {
        throw new BadRequestError('User progress not found');
    }

    const shareText = `🔥 I'm on a ${userProgress.streak}-day streak on Kai! I've earned ${userProgress.points} points and reached Level ${userProgress.level}. #Learning #Kai`;
    
    const shareData = {
        text: shareText,
        stats: {
            streak: userProgress.streak,
            points: userProgress.points,
            level: userProgress.level
        },
        platforms: {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kai-learning.com')}&summary=${encodeURIComponent(shareText)}`
        }
    };

    res.status(200).json(successResponse(shareData, 'Social share data generated'));
});

import { achievementService } from '../services/achievement.service.ts';
import type { AuthRequest } from '@shared/index.ts';

export const getAchievements = asyncHandler(async (req: Request, res: Response) => {
  const achievements = await achievementService.getAchievements();
  res.json(successResponse(achievements, 'Achievements retrieved'));
});

export const getMyAchievements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const achievements = await achievementService.getUserAchievements(userId);
  res.json(successResponse(achievements, 'My achievements retrieved'));
});
