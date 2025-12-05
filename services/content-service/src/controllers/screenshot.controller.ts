import type { Request, Response } from 'express';
import type { AuthRequest } from '@shared/index';
import { prisma } from '../prisma';
import { successResponse } from '@shared/index';
import { asyncHandler } from '@shared/index';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractTextFromImage } from '../services/ocr.service';
import { processingService } from '../services/processing.service';
import kafkaClient from '../kafka';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `screenshot-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

import type { FileFilterCallback } from 'multer';

const fileFilter = (_req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG and JPEG are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

export const uploadScreenshot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const filePath = file.path;
  
  // Upload to R2 or keep local
  const { uploadFile } = await import('../services/r2-storage.service');
  const uploadResult = await uploadFile(filePath, file.filename);

  // Create capture record with R2 URL or local URL
  const capture = await prisma.capture.create({
    data: {
      userId,
      type: 'SCREENSHOT',
      content: uploadResult.url,
      source: req.body.source || 'Mobile App',
      status: 'PENDING',
      ocrStatus: 'PROCESSING',
      metadata: JSON.stringify({
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        storage: uploadResult.storage,
        storageKey: uploadResult.key
      })
    }
  });

  // Start Processing Pipeline (OCR -> AI)
  // Use local file path if R2, or original path if local
  // Note: If R2 is enabled, we might need to download it again or keep a temp copy.
  // For now, we assume the file is still available locally or we just use the path.
  // In a real production setup with ephemeral instances, we'd need to download from R2 if not local.
  const processingFilePath = filePath; 
  
  processingService.processCapture(capture.id, processingFilePath, userId).catch((err: unknown) => {
    console.error('Processing pipeline error:', err);
  });

  // Emit SCREENSHOT_UPLOADED event
  await kafkaClient.send('screenshot-processor', [{
    type: 'SCREENSHOT_UPLOADED',
    payload: {
      captureId: capture.id,
      userId,
      filePath: processingFilePath,
      timestamp: new Date().toISOString()
    }
  }]);

  res.json(successResponse({
    id: capture.id,
    fileUrl: uploadResult.url,
    storage: uploadResult.storage,
    status: 'processing'
  }, 'Screenshot uploaded successfully'));
});

export const getScreenshot = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id } = req.params;

  const capture = await prisma.capture.findFirst({
    where: {
      id,
      userId,
      type: 'SCREENSHOT'
    }
  });

  if (!capture) {
    return res.status(404).json({ success: false, message: 'Screenshot not found' });
  }

  res.json(successResponse(capture, 'Screenshot retrieved'));
});
