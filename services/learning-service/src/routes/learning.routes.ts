import { Router } from 'express';
import { createTopic, createFlashcard, completeTopic, reviewFlashcard, getTopics, getFlashcards, deleteTopic, archiveTopic, restoreTopic, deleteFlashcard, archiveFlashcard, restoreFlashcard } from '../controllers/learning.controller';
import { authMiddleware, requireVerifiedEmail } from '@shared/index';

const router = Router();

router.post('/topics', authMiddleware, requireVerifiedEmail, createTopic);
router.get('/topics', authMiddleware, requireVerifiedEmail, getTopics);
router.delete('/topics/:id', authMiddleware, requireVerifiedEmail, deleteTopic);
router.post('/topics/:id/archive', authMiddleware, requireVerifiedEmail, archiveTopic);
router.post('/topics/:id/restore', authMiddleware, requireVerifiedEmail, restoreTopic);

router.post('/flashcards', authMiddleware, requireVerifiedEmail, createFlashcard);
router.get('/flashcards', authMiddleware, requireVerifiedEmail, getFlashcards);
router.delete('/flashcards/:id', authMiddleware, requireVerifiedEmail, deleteFlashcard);
router.post('/flashcards/:id/archive', authMiddleware, requireVerifiedEmail, archiveFlashcard);
router.post('/flashcards/:id/restore', authMiddleware, requireVerifiedEmail, restoreFlashcard);

router.post('/flashcards/review', authMiddleware, requireVerifiedEmail, reviewFlashcard);
router.post('/topics/complete', authMiddleware, requireVerifiedEmail, completeTopic);

// Intervention Routes
import { getPendingInterventions, respondToIntervention } from '../controllers/intervention.controller';

router.get('/interventions/pending', authMiddleware, requireVerifiedEmail, getPendingInterventions);
router.get('/interventions/pending', authMiddleware, requireVerifiedEmail, getPendingInterventions);
router.post('/interventions/:id/respond', authMiddleware, requireVerifiedEmail, respondToIntervention);

// Focus Mode Configuration Routes
import { createFocusMode, getFocusModes, getCurrentFocusMode, activateFocusMode, updateFocusMode, deleteFocusMode } from '../controllers/focus-mode-config.controller';
import { validateRequest, focusModeSchema } from '@shared/index';

router.post('/focus-modes', authMiddleware, requireVerifiedEmail, validateRequest(focusModeSchema), createFocusMode);
router.get('/focus-modes', authMiddleware, requireVerifiedEmail, getFocusModes);
router.get('/focus-modes/current', authMiddleware, requireVerifiedEmail, getCurrentFocusMode);
router.put('/focus-modes/:id/activate', authMiddleware, requireVerifiedEmail, activateFocusMode);
router.put('/focus-modes/:id', authMiddleware, requireVerifiedEmail, updateFocusMode);
router.delete('/focus-modes/:id', authMiddleware, requireVerifiedEmail, deleteFocusMode);

export default router;
