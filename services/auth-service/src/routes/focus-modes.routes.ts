import { Router } from 'express';
import { authMiddleware } from '@shared/index.ts';
import * as focusModesController from '../controllers/focus-modes.controller.ts';

const router = Router();

router.post('/', authMiddleware, focusModesController.createFocusMode);
router.get('/', authMiddleware, focusModesController.getFocusModes);
router.get('/current', authMiddleware, focusModesController.getCurrentFocusMode);
router.put('/:id/activate', authMiddleware, focusModesController.activateFocusMode);
router.put('/:id', authMiddleware, focusModesController.updateFocusMode);
router.delete('/:id', authMiddleware, focusModesController.deleteFocusMode);

export default router;
