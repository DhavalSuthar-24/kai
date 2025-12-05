import { Router, type RequestHandler } from 'express';
import { DeepDiveController } from '../controllers/deep-dive.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new DeepDiveController();

router.post('/ask', authMiddleware, controller.ask as RequestHandler);

export default router;
