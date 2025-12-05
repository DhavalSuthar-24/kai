import prisma from '../prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('marketplace-service');

interface PublishPackDTO {
    userId: string;
    name: string;
    description: string;
    topics: string[];
    content: any; // JSON content to encrypted
}

export class MarketplaceService {

    async publishStudyPack(data: PublishPackDTO) {
        // 1. Audit Pack (Mock AI check)
        const quality = await this.auditPack(data);

        if (quality < 0.7) {
            throw new Error(`Pack quality too low (${quality}). Please add more comprehensive content.`);
        }

        // 2. Calculate Price (Based on quality + size)
        const basePrice = 500; // 500 credits
        const price = Math.round(basePrice * quality);

        // 3. Encrypt Content (Mock)
        // In prod: crypto.subtle.encrypt(...)
        const encryptedContent = JSON.stringify(data.content); 

        // 4. Create Record
        const pack = await prisma.studyPack.create({
            data: {
                creatorId: data.userId, // Or anonymized ID
                name: data.name,
                description: data.description,
                topics: data.topics,
                quality,
                price,
                encryptedContent
            }
        });

        logger.info(`Published Study Pack: ${pack.id} by ${data.userId}`);
        return pack;
    }

    async purchasePack(userId: string, packId: string) {
        // 1. Fetch Pack
        const pack = await prisma.studyPack.findUnique({ where: { id: packId } });
        if (!pack) throw new Error('Pack not found');

        // 2. Check Credits (Mock)
        // In prod: call AuthService or payment provider
        const userCredits = 10000; 
        if (userCredits < pack.price) throw new Error('Insufficient credits');

        // 3. Create UserPack (Access Grant)
        await prisma.userPack.create({
            data: {
                userId,
                packId
            }
        });

        // 4. Record Transaction
        const platformFee = Math.round(pack.price * 0.2); // 20%
        await prisma.revenueTransaction.create({
            data: {
                fromUser: userId,
                toCreator: pack.creatorId,
                packId,
                amount: pack.price,
                platformFee
            }
        });
        
        // 5. Increment Purchase Count
        await prisma.studyPack.update({
            where: { id: packId },
            data: { purchaseCount: { increment: 1 } }
        });

        return { success: true, remainingCredits: userCredits - pack.price };
    }

    async getFeed(userId: string, filters: any) {
        // Simple search for MVP
        // In prod: Vector search via 'topics' embedding
        
        return prisma.studyPack.findMany({
            where: {
                purchaseCount: { gte: 0 }, // Placeholder for actual filters
                quality: { gte: 0.7 }
            },
            orderBy: { purchaseCount: 'desc' },
            take: 20
        });
    }

    private async auditPack(data: PublishPackDTO): Promise<number> {
        // Mock AI Audit
        // Real: Send content to AI Service -> Evaluate Bloom's taxonomy coverage, clarity, etc.
        const lengthScore = Math.min(JSON.stringify(data.content).length / 1000, 1);
        const randomFactor = Math.random() * 0.2; // 0.0 - 0.2 variability
        return Math.min(0.8 + randomFactor, 1.0); // Always > 0.8 for demo happiness :)
    }
}
