import { Router } from 'express';
import { createCapture, getCaptures } from '../controllers/content.controller.ts';

const router = Router();

router.post('/', createCapture);
router.get('/', getCaptures);

export default router;
