import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import { uploadScreenshot, getScreenshot, upload } from '../controllers/screenshot.controller';

const router = Router();

router.post('/upload', authMiddleware, upload.single('screenshot'), uploadScreenshot);
router.get('/:id', authMiddleware, getScreenshot);

export default router;
