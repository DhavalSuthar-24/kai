import { Router } from 'express';
import { getNotifications, scheduleNotification } from '../controllers/notification.controller.ts';
import { authMiddleware, validateRequest } from '@shared/index.ts';
import { z } from 'zod';

const router: Router = Router();

router.use(authMiddleware);

router.get('/', getNotifications);

router.post(
  '/schedule',
  validateRequest(
    z.object({
      type: z.string(),
      channel: z.enum(['EMAIL', 'PUSH', 'SMS']),
      subject: z.string().optional(),
      body: z.string(),
      scheduledFor: z.string().datetime(),
      data: z.record(z.string(), z.any()).optional(),
      phoneNumber: z.string().optional(),
    })
  ),
  scheduleNotification
);

export default router;
