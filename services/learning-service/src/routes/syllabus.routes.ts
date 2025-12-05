import { Router } from 'express';
import { generateSyllabus, getSyllabus, updateProgress, regenerateSyllabus } from '../controllers/syllabus.controller.ts';
import { authMiddleware } from '@shared/index.ts';

const router = Router();

router.post('/generate', authMiddleware, generateSyllabus);
router.get('/:topicId', authMiddleware, getSyllabus);
router.put('/:id/progress', authMiddleware, updateProgress);
router.post('/:id/regenerate', authMiddleware, regenerateSyllabus);

export default router;
