import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import { successResponse, errorResponse, asyncHandler } from '@shared/index.ts';
import { challengeService } from '../services/challenge.service.ts';

export const createChallenge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const challenge = await challengeService.createChallenge(userId, req.body);
  res.status(201).json(successResponse(challenge, 'Challenge created'));
});

export const joinChallenge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const { id } = req.params;
  const participant = await challengeService.joinChallenge(userId, id);
  res.json(successResponse(participant, 'Joined challenge'));
});

export const getChallenges = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const challenges = await challengeService.getChallenges(userId);
  res.json(successResponse(challenges, 'Challenges retrieved'));
});

export const getMyChallenges = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const challenges = await challengeService.getUserChallenges(userId);
  res.json(successResponse(challenges, 'My challenges retrieved'));
});
