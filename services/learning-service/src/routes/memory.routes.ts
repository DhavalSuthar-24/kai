import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import { getMemoryFeed, markMemoryViewed } from '../controllers/memory.controller';

const router = Router();

router.get('/feed', authMiddleware, getMemoryFeed);
router.post('/:id/view', authMiddleware, markMemoryViewed);

export default router;
