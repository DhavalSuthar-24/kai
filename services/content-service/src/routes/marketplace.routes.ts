import { Router, type RequestHandler } from 'express';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new MarketplaceController();

router.post('/publish', authMiddleware, controller.publish as RequestHandler);
router.post('/purchase/:packId', authMiddleware, controller.purchase as RequestHandler);
router.get('/feed', authMiddleware, controller.getFeed as RequestHandler);

export default router;
