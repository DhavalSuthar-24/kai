import { type Request, type Response, type NextFunction } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse } from '@shared/index.ts';
import kafkaClient from '../kafka.ts';

export const createCapture = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, type, content, source } = req.body;

  const capture = await prisma.capture.create({
    data: {
      userId,
      type,
      content,
      source,
    },
  });

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
    console.error('Failed to publish CONTENT_CAPTURED event', error);
  }

  res.status(201).json(successResponse(capture, 'Content captured successfully'));
});

export const getCaptures = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query;
  
  const captures = await prisma.capture.findMany({
    where: {
      userId: userId as string,
    },
  });

  res.status(200).json(successResponse(captures));
});
