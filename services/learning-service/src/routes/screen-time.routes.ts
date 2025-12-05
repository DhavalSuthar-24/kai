import { Router } from 'express';
import { ScreenTimeController } from '../controllers/screen-time.controller';
import { authMiddleware } from '@shared/index.ts';

const router = Router();
const controller = new ScreenTimeController();

router.post('/', authMiddleware, controller.capture);

export default router;
