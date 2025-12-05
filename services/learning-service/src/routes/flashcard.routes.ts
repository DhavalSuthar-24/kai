import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import * as flashcardController from '../controllers/flashcard.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Flashcard review
router.get('/due', flashcardController.getDueFlashcards);
router.post('/:id/review', flashcardController.reviewFlashcard);
router.get('/stats', flashcardController.getFlashcardStats);

// Flashcard CRUD
router.post('/', flashcardController.createFlashcard);

export default router;
