import { Router, type RequestHandler } from 'express';
import { PrivacyController } from '../controllers/privacy.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new PrivacyController();

router.post('/keys', authMiddleware, controller.updateKey as RequestHandler);
router.delete('/account', authMiddleware, controller.deleteAccount as RequestHandler);

export default router;
