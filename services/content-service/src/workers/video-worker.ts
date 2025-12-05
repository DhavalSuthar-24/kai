import { QueueFactory, createLogger } from '@shared/index.ts';
import { Job } from 'bullmq';
import prisma from '../prisma.ts';

const logger = createLogger('video-worker');

export const videoQueue = QueueFactory.createQueue('video-queue');

interface VideoJobData {
  captureId: string;
  userId: string;
  content: string; // URL or path
}

const processVideoJob = async (job: Job<VideoJobData>) => {
  const { captureId, userId, content } = job.data;
  
  logger.info(`Processing video job ${job.id}`, { captureId, userId });

  try {
    // Update status to PROCESSING
    await prisma.capture.update({
      where: { id: captureId },
      data: { videoStatus: 'PROCESSING' }
    });

    // Simulate video processing (transcription)
    // In a real scenario, this would call an AI service like OpenAI Whisper or Google Cloud Speech-to-Text
    logger.info('Simulating video transcription...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const mockTranscription = `[MOCK TRANSCRIPTION] This is a simulated transcription for video at ${content}. 
    The video discusses important concepts about microservices and event-driven architecture. 
    Key takeaways include loose coupling, scalability, and resilience.`;

    // Update capture with transcription and status
    await prisma.capture.update({
      where: { id: captureId },
      data: { 
        videoStatus: 'COMPLETED',
        transcription: mockTranscription,
        extractedText: mockTranscription, // Also populate extractedText for search compatibility
        aiProcessed: true,
        status: 'PROCESSED'
      }
    });

    logger.info(`Video job ${job.id} completed successfully`);
    return { success: true, transcription: mockTranscription };

  } catch (error: any) {
    logger.error(`Video job ${job.id} failed`, error);

    await prisma.capture.update({
      where: { id: captureId },
      data: { 
        videoStatus: 'FAILED',
        processingError: error.message,
        status: 'FAILED'
      }
    });

    throw error;
  }
};

export const videoWorker = QueueFactory.createWorker('video-queue', processVideoJob);

videoWorker.on('completed', (job) => {
  logger.info(`Video job ${job.id} completed`);
});

videoWorker.on('failed', (job, err) => {
  logger.error(`Video job ${job?.id} failed`, err);
});

logger.info('Video worker started');
