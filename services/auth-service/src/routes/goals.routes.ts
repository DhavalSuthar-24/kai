import { Router } from 'express';
import { authMiddleware } from '@shared/index.ts';
import * as goalsController from '../controllers/goals.controller.ts';

const router = Router();

router.post('/', authMiddleware, goalsController.createGoal);
router.get('/', authMiddleware, goalsController.getGoals);
router.get('/progress', authMiddleware, goalsController.getGoalProgress);
router.put('/:id', authMiddleware, goalsController.updateGoal);
router.delete('/:id', authMiddleware, goalsController.deleteGoal);

export default router;
