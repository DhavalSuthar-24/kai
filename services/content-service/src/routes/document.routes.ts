import { Router, type RequestHandler } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new DocumentController();

router.post('/upload', authMiddleware, controller.upload as RequestHandler);
router.post('/search', authMiddleware, controller.search as RequestHandler);
router.get('/:documentId/status', authMiddleware, controller.getStatus as RequestHandler);

export default router;
