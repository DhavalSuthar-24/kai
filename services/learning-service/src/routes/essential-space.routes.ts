import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import { getEssentialSpace, refreshEssentialSpace } from '../controllers/essential-space.controller';

const router = Router();

router.get('/', authMiddleware, getEssentialSpace);
router.post('/refresh', authMiddleware, refreshEssentialSpace);

export default router;
