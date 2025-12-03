import { Router } from 'express';
import { createTopic, createFlashcard, completeTopic, reviewFlashcard } from '../controllers/learning.controller';

const router = Router();

router.post('/topics', createTopic);
router.post('/flashcards', createFlashcard);
router.post('/flashcards/review', reviewFlashcard);
router.post('/topics/complete', completeTopic);

// Intervention Routes
import { getPendingInterventions, respondToIntervention } from '../controllers/intervention.controller';
import { authMiddleware } from '@shared/index';

router.get('/interventions/pending', authMiddleware, getPendingInterventions);
router.post('/interventions/:id/respond', authMiddleware, respondToIntervention);

export default router;
