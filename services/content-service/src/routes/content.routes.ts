import { Router } from 'express';
import { createCapture, getCaptures, getSearchSuggestions, deleteCapture, archiveCapture, restoreCapture } from '../controllers/content.controller.ts';
import { validateRequest, createCaptureSchema, authMiddleware, requireVerifiedEmail } from '@shared/index.ts';

const router = Router();

router.post('/', validateRequest(createCaptureSchema), authMiddleware, requireVerifiedEmail, createCapture);
router.get('/', authMiddleware, requireVerifiedEmail, getCaptures);
router.get('/search/suggestions', authMiddleware, requireVerifiedEmail, getSearchSuggestions);
router.delete('/:id', authMiddleware, requireVerifiedEmail, deleteCapture);
router.post('/:id/archive', authMiddleware, requireVerifiedEmail, archiveCapture);
router.post('/:id/restore', authMiddleware, requireVerifiedEmail, restoreCapture);

export default router;
