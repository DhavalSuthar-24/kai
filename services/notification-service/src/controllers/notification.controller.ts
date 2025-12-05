import { type Request, type Response } from 'express';
import prisma from '../prisma.ts';
import { asyncHandler, successResponse, type AuthRequest, NotFoundError } from '@shared/index.ts';
import { emailQueue } from '../workers/email-worker.ts';
import { pushQueue } from '../workers/push-worker.ts';
import { smsQueue } from '../workers/sms-worker.ts';
import { NotificationType } from '../types/notifications.ts';

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { page = 1, limit = 20, type } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = { userId };
  
  if (type) {
    where.type = type;
  }

  const [notifications, total] = await Promise.all([
    prisma.notificationHistory.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notificationHistory.count({ where }),
  ]);

  res.status(200).json(successResponse({
    data: notifications,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }, 'Notifications retrieved successfully'));
});

export const scheduleNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, channel, subject, body, scheduledFor, data, phoneNumber } = req.body;

  if (!scheduledFor) {
    throw new Error('scheduledFor is required');
  }

  const delay = new Date(scheduledFor).getTime() - Date.now();
  if (delay < 0) {
    throw new Error('Scheduled time must be in the future');
  }

  // Queue the job with delay
  let jobId;
  if (channel === 'EMAIL') {
    const job = await emailQueue.add(
      'email-scheduled',
      { userId, to: req.user!.email, subject, body, type, variables: data },
      { delay }
    );
    jobId = job.id;
  } else if (channel === 'PUSH') {
    const job = await pushQueue.add(
      'push-scheduled',
      { userId, title: subject, body, type, data },
      { delay }
    );
    jobId = job.id;
  } else if (channel === 'SMS') {
    if (!phoneNumber) throw new Error('phoneNumber is required for SMS');
    const job = await smsQueue.add(
      'sms-scheduled',
      { userId, phoneNumber, body, type },
      { delay }
    );
    jobId = job.id;
  } else {
    throw new Error('Invalid channel');
  }

  res.status(200).json(successResponse({ jobId, scheduledFor }, 'Notification scheduled successfully'));
});
