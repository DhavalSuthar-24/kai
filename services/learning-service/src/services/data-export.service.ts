import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('data-export-service');

export class DataExportService {

    async exportUserData(userId: string) {
        // Aggregate all user data
        const [kaizenSessions, mastery, reviews, curriculum] = await Promise.all([
            prisma.kaizenSession.findMany({ where: { userId } }),
            prisma.userMastery.findMany({ where: { userId } }),
            prisma.reviewLog.findMany({ where: { userId } }),
            prisma.curriculum.findMany({ where: { userId }, include: { modules: true } })
        ]);

        return {
            exportDate: new Date(),
            userId,
            data: {
                kaizenSessions,
                mastery,
                reviews,
                curriculum
            }
        };
    }

    async deleteUserData(userId: string) {
        logger.warn(`Deleting all data for user ${userId}`);
        
        // Transaction to ensure complete cleanup
        await prisma.$transaction([
            prisma.kaizenSession.deleteMany({ where: { userId } }),
            prisma.userMastery.deleteMany({ where: { userId } }),
            prisma.reviewLog.deleteMany({ where: { userId } }),
            prisma.flashcard.deleteMany({ where: { topic: { userId } } }), // Cascade via topic usually, but being safe
            prisma.topic.deleteMany({ where: { userId } }),
            prisma.curriculum.deleteMany({ where: { userId } })
        ]);

        return { success: true };
    }
}
