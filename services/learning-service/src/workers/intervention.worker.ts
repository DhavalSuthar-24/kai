import { Worker, Job } from 'bullmq';
import { getConfig, createLogger } from '@shared/index.ts';
import { ContextService } from '../services/context.service';
import { SmartLimitService } from '../services/smart-limit.service';

const config = getConfig();
const logger = createLogger('intervention-worker');
const contextService = new ContextService();

export const startInterventionWorker = () => {
    const worker = new Worker('intervention-queue', async (job: Job) => {
        logger.info(`Processing intervention for user ${job.data.userId}`);
        
        try {
            const { userId, appName, reason } = job.data;
            
            // 1. Get Context
            const context = await contextService.getContext(userId);
            
            // 2. Get Recommendation (Call Content Service)
            // Mocking the call since we don't have a direct shared client for HTTP yet
            // const recommendation = await fetch('http://content-service:3002/content/recommend', ...);
            const recommendation = { contentType: 'QUIZ', topic: 'Docker' }; // Mock

            // 3. Send WebSocket Redirect
            // sendRedirectSocket(userId, { type: 'REDIRECT', recommendation });
            
            // 4. Send Push Notification
            // await notifyUser(userId, "Time for a Brain Boost!", `Let's do a quick ${recommendation.topic} quiz.`);
            
            logger.info(`Intervention executed for ${userId}: Redirect to ${recommendation.contentType}`);
            
            return { processed: true, action: 'REDIRECT' };
        } catch (error) {
            logger.error('Intervention job failed', error);
            throw error;
        }
    }, {
        connection: {
            host: config.REDIS_HOST,
            port: parseInt(config.REDIS_PORT)
        }
    });

    worker.on('completed', (job) => {
        logger.info(`Intervention job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Intervention job ${job?.id} failed`, err);
    });
    
    return worker;
};
