import { Worker, Job } from 'bullmq';
import { getConfig, createLogger } from '@shared/index.ts';
import prisma from '../prisma';

const config = getConfig();
const logger = createLogger('content-gen-worker');

export const startContentGenWorker = () => {
    const worker = new Worker('daily-content-queue', async (job: Job) => {
        logger.info(`Processing content gen for user ${job.data.userId}`);
        const { userId, date, topicId, masteryLevel } = job.data;
        
        try {
            // 1. Get Topic info
            const topic = await prisma.topic.findUnique({ where: { id: topicId } });
            if (!topic) throw new Error('Topic not found');

            // 2. Call AI Service (Mocked here, use fetch in real)
            // const theory = await fetch(...)
            const theory = {
                title: topic.name,
                introduction: "AI Generated content...",
                keyPoints: ["Point 1", "Point 2"],
                summary: "Summary..."
            };

            const quiz = {
                question: "Test question?",
                options: ["A", "B", "C"],
                correctAnswer: "A"
            };

            // 3. Save to DB
            const dailyContent = await prisma.dailyContent.upsert({
                where: { userId_date: { userId, date: new Date(date) } },
                update: {
                     sections: JSON.stringify({ theory, quiz })
                },
                create: {
                    userId,
                    date: new Date(date),
                    sections: JSON.stringify({ theory, quiz })
                }
            });

            // 4. Publish Event (Kafka) - Assuming wrapper exists or just using logger for now
            logger.info(`Daily content generated for ${userId}`, dailyContent);
            
            return { processed: true };
        } catch (error) {
            logger.error('Content gen failed', error);
            throw error;
        }
    }, {
        connection: {
            host: config.REDIS_HOST,
            port: parseInt(config.REDIS_PORT)
        }
    });
    
    return worker;
};
