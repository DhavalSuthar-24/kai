import prisma from '../prisma.ts';
import kafkaClient from '../kafka.ts';
import { createLogger } from '@shared/index.ts';
import { extractTextFromImage } from './ocr.service.ts';
import { aiService } from './ai.service.ts';
import fs from 'fs';

const logger = createLogger('processing-service');

export class ProcessingService {
  
  async processCapture(captureId: string, filePath: string, userId: string) {
    try {
      logger.info(`Starting processing for capture ${captureId}`);

      // 1. Perform OCR
      const ocrResult = await extractTextFromImage(filePath);
      
      // 2. Save OCR Metadata
      await prisma.screenshotMetadata.upsert({
        where: { captureId },
        create: {
          captureId,
          ocrText: ocrResult.text,
          hasText: ocrResult.text.length > 0,
        },
        update: {
          ocrText: ocrResult.text,
          hasText: ocrResult.text.length > 0,
        }
      });

      // 3. AI Analysis (if text exists)
      let aiResult = null;
      if (ocrResult.success && ocrResult.text.length > 50) {
        aiResult = await aiService.analyzeContent(ocrResult.text);
      }

      // 4. Update Capture with AI results
      const updatedCapture = await prisma.capture.update({
        where: { id: captureId },
        data: {
          status: 'PROCESSED',
          ocrStatus: ocrResult.success ? 'COMPLETED' : 'FAILED',
          aiProcessed: !!aiResult,
          extractedText: ocrResult.text,
          entities: aiResult ? JSON.stringify(aiResult.entities) : null,
          sentiment: aiResult?.sentiment,
          importanceScore: aiResult?.importanceScore,
          metadata: aiResult ? JSON.stringify({ summary: aiResult.summary, category: aiResult.category }) : null
        }
      });

      // 5. Publish Event with standardized structure
      await kafkaClient.send('content-events', [{
        type: 'CONTENT_PROCESSED',
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          captureId,
          userId,
          status: 'PROCESSED',
          extractedText: ocrResult.text,
          topics: aiResult?.entities || []
        },
        metadata: {
          correlationId: crypto.randomUUID(),
          source: 'content-service'
        }
      }]);

      logger.info(`Processing completed for capture ${captureId}`);

    } catch (error) {
      logger.error(`Processing failed for capture ${captureId}`, error);
      
      await prisma.capture.update({
        where: { id: captureId },
        data: { 
          status: 'FAILED',
          processingError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}

export const processingService = new ProcessingService();
