import Tesseract from 'tesseract.js';
import { createLogger } from '@shared/index';

const logger = createLogger('ocr-service');

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  try {
    logger.info(`Starting OCR for image: ${imagePath}`);
    
    const result = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    logger.info(`OCR completed. Confidence: ${confidence}%, Text length: ${text.length}`);

    return {
      text,
      confidence,
      success: true
    };
  } catch (error: any) {
    logger.error('OCR failed', error);
    return {
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}
