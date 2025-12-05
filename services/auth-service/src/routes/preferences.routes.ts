import { Router } from 'express';
import { authMiddleware, requireVerifiedEmail } from '@shared/index.ts';
import * as preferencesController from '../controllers/preferences.controller.ts';

const router = Router();

router.get('/', authMiddleware, requireVerifiedEmail, preferencesController.getPreferences);
router.post('/', authMiddleware, requireVerifiedEmail, preferencesController.setPreferences);

export default router;
