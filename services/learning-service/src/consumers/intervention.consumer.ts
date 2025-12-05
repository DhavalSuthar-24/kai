import { Queue } from 'bullmq';
import { createLogger, getConfig } from '@shared/index.ts';

const logger = createLogger('intervention-consumer');
const config = getConfig();

const interventionQueue = new Queue('intervention-queue', {
    connection: {
        host: config.REDIS_HOST,
        port: parseInt(config.REDIS_PORT)
    }
});

export const handleInterventionEvent = async (message: any) => {
    try {
        logger.info('Received intervention event', message);
        
        if (message.type === 'INTERVENTION_TRIGGERED') {
            await interventionQueue.add('process-intervention', {
                userId: message.data.userId,
                appName: message.data.appName,
                reason: message.data.reason,
                timestamp: message.data.timestamp
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 }
            });
            logger.info(`Added intervention job for user ${message.data.userId}`);
        }
    } catch (error) {
        logger.error('Error handling intervention event', error);
    }
};
