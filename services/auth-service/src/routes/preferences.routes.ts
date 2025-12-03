import { Router } from 'express';
import { authMiddleware } from '@shared/index.ts';
import * as preferencesController from '../controllers/preferences.controller.ts';

const router = Router();

router.get('/', authMiddleware, preferencesController.getPreferences);
router.post('/', authMiddleware, preferencesController.setPreferences);

export default router;
