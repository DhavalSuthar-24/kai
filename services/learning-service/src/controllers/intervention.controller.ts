import type { Response } from 'express';
import type { AuthRequest } from '@shared/index.ts';
import prisma from '../prisma.ts';
import { successResponse, errorResponse, asyncHandler } from '@shared/index.ts';
import { interventionService } from '../services/intervention.service.ts';

export const getPendingInterventions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const interventions = await prisma.intervention.findMany({
    where: {
      userId,
      status: 'PENDING',
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(successResponse(interventions, 'Pending interventions retrieved'));
});

export const respondToIntervention = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const { id } = req.params;
  const { response } = req.body; // ACCEPTED or DISMISSED

  if (!['ACCEPTED', 'DISMISSED'].includes(response)) {
    res.status(400).json(errorResponse('Invalid response type', 400));
    return;
  }

  if (!id) {
    res.status(400).json(errorResponse('Missing intervention ID', 400));
    return;
  }

  const updated = await interventionService.handleResponse(id, userId as string, response);

  res.json(successResponse(updated, 'Intervention response recorded'));
});

export const recordInterventionResponse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const { ruleId, userAction, timeToAction, contextBefore, contextAfter } = req.body;

  const intervention = await prisma.interventionSuccess.create({
    data: {
      userId,
      ruleId,
      userAction,
      timeToAction,
      wasSuccessful: userAction === 'ACCEPTED',
      contextBefore: contextBefore ? JSON.stringify(contextBefore) : null,
      contextAfter: contextAfter ? JSON.stringify(contextAfter) : null
    }
  });

  res.status(201).json(successResponse(intervention, 'Intervention response recorded'));
});
