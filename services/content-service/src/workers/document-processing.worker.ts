import { Worker, Job } from 'bullmq';
import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';
import axios from 'axios';
import { getConfig } from '@shared/index.ts';

const logger = createLogger('document-worker');
const config = getConfig();

interface DocumentJob {
    documentId: string;
    userId: string;
    fileUrl: string;
    fileType: string;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'; // Should use env

export const startDocumentProcessingWorker = () => {
    const worker = new Worker<DocumentJob>('document-processing-queue', async (job: Job<DocumentJob>) => {
        const { documentId, userId, fileUrl, fileType } = job.data;
        logger.info(`Processing document ${documentId} for user ${userId}`);

        try {
            // 1. Update Status to PROCESSING
            await prisma.documentUpload.update({
                where: { id: documentId },
                data: { status: 'PROCESSING', processingProgress: 10 }
            });

            // 2. Call AI Service to process document
            // We send the fileUrl (or path) to the AI service
            const response = await axios.post(`${AI_SERVICE_URL}/api/v1/process/document`, {
                file_url: fileUrl,
                file_type: fileType,
                document_id: documentId
            });

            const result = response.data.data; // Assumed structure

            // 3. Save Processed Data
            await prisma.processedDocument.create({
                data: {
                    uploadId: documentId,
                    structure: JSON.stringify(result.structure),
                    topics: JSON.stringify(result.topics),
                    curriculum: JSON.stringify(result.curriculum),
                    flashcards: JSON.stringify(result.flashcards),
                    questions: JSON.stringify(result.practice_questions),
                    wordCount: result.analytics?.word_count || 0,
                    readingTime: result.analytics?.reading_time || 0,
                    difficultyScore: result.analytics?.difficulty_score || 0
                }
            });

            // 4. Update Status to COMPLETED
            await prisma.documentUpload.update({
                where: { id: documentId },
                data: { 
                    status: 'COMPLETED', 
                    processingProgress: 100 
                }
            });
            
            logger.info(`Document ${documentId} processing complete`);

        } catch (error: any) {
            logger.error(`Document processing failed for ${documentId}`, error);
            
            await prisma.documentUpload.update({
                where: { id: documentId },
                data: { 
                    status: 'FAILED', 
                    errorMessage: error.message 
                }
            });
            
            throw error; // Let BullMQ handle retries
        }
    }, {
        connection: {
            host: config.REDIS_HOST,
            port: parseInt(config.REDIS_PORT)
        }
    });

    worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed`, err);
    });
    
    return worker;
};
