import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import { startFocus, endFocus, abandonFocus, getActive, getHistory } from '../controllers/focus-tunnel.controller';

const router = Router();

router.post('/start', authMiddleware, startFocus);
router.post('/end', authMiddleware, endFocus);
router.post('/abandon', authMiddleware, abandonFocus);
router.get('/active', authMiddleware, getActive);
router.get('/history', authMiddleware, getHistory);

export default router;
