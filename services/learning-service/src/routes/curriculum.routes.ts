import { Router, type RequestHandler } from 'express';
import { CurriculumController } from '../controllers/curriculum.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new CurriculumController();

router.post('/generate', authMiddleware, controller.generate as RequestHandler);

export default router;
