import { type Request, type Response } from 'express';
import prisma from '../prisma.ts';
import { successResponse, asyncHandler, type AuthRequest } from '@shared/index.ts';

// POST /metrics - Ingest behavior metrics
export const ingestMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { metricType, value, appName, context } = req.body;

  const metric = await prisma.behaviorMetric.create({
    data: {
      userId,
      metricType,
      value,
      appName,
      context: context ? JSON.stringify(context) : null
    }
  });

  res.status(201).json(successResponse(metric, 'Metric recorded'));
});

