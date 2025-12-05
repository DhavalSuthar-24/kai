import { Router, type RequestHandler } from 'express';
import { OfflineController } from '../controllers/offline.controller.ts';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new OfflineController();

router.get('/prefetch', authMiddleware, controller.prefetch as RequestHandler);
router.post('/sync', authMiddleware, controller.sync as RequestHandler);
router.get('/export', authMiddleware, controller.exportData as RequestHandler);
router.delete('/data', authMiddleware, controller.deleteData as RequestHandler);

export default router;
