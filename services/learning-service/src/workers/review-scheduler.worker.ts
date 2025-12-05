import { Worker, Job, Queue } from 'bullmq';
import { createLogger, getConfig } from '@shared/index.ts';
import kafkaClient from '../kafka';
import { RetentionService } from '../services/retention.service';
import prisma from '../prisma';

const logger = createLogger('review-scheduler');
const config = getConfig();
const retentionService = new RetentionService();

// Queue to schedule the nightly job
export const reviewSchedulerQueue = new Queue('review-scheduler-queue', {
    connection: {
        host: config.REDIS_HOST,
        port: parseInt(config.REDIS_PORT)
    }
});

export const startReviewSchedulerWorker = () => {
    const worker = new Worker('review-scheduler-queue', async (job: Job) => {
        logger.info('Running nightly review scheduler');
        
        try {
            // 1. Get all users? Or iterate in batches.
            // For MVP, fetch all users who have active cards.
            // Better: find UserMastery where nextReviewDate <= now
            
            // This query might be heavy if not batched by user.
            // Let's get distinct users with due reviews.
            const dueMastery = await prisma.userMastery.groupBy({
                by: ['userId'],
                where: {
                    nextReviewDate: {
                        lte: new Date()
                    }
                },
                _count: {
                    subtopicId: true
                }
            });
            
            for (const item of dueMastery) {
                const userId = item.userId;
                const count = item._count.subtopicId;
                
                if (count > 0) {
                    logger.info(`User ${userId} has ${count} due reviews`);
                    
                    // 2. Notify User via Kafka (Notification Service)
                    await kafkaClient.send('notification-events', [{
                        type: 'REVIEW_DUE',
                        data: {
                            userId,
                            count,
                            message: `You have ${count} topics due for review today!`
                        }
                    }]);
                    
                    // 3. Create Daily Content entry if not exists (optional)
                    // We could pre-generate the quiz here, but better to do it on demand 
                    // or via the content-gen worker.
                }
            }

        } catch (error: any) {
            logger.error('Review scheduler failed', error);
            throw error;
        }
    }, {
        connection: {
            host: config.REDIS_HOST,
            port: parseInt(config.REDIS_PORT)
        }
    });

    // Schedule the job to run immediately for testing or setup cron
    // In production, we'd use `repeat` option when adding job.
    return worker;
};

// Function to add the repeatable job
export const scheduleNightlyJob = async () => {
    await reviewSchedulerQueue.add('nightly-review-check', {}, {
        repeat: {
            pattern: '0 4 * * *', // Run at 4 AM every day
        }
    });
    logger.info('Scheduled nightly review check');
};
