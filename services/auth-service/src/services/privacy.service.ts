import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('privacy-service');

export class PrivacyService {
    
    async storePublicKey(userId: string, publicKey: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { publicKey }
        });
        logger.info(`Updated public key for user ${userId}`);
        return { success: true };
    }

    async initiateDeletion(userId: string) {
        // Soft delete user and mark for full cascade
        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() }
        });

        // Trigger Queue Job for other services (Mocked for now)
        // kafka.produce('user-events', 'user.deleted', { userId });
        
        logger.warn(`User ${userId} marked for deletion`);
        return { success: true, message: 'Account scheduled for deletion' };
    }
}
