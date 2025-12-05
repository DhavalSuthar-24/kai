import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('graph-service');

export class GraphService {
    async findNextTopics(userId: string): Promise<any[]> {
        // Find topics where all prerequisites are mastered
        // Using raw query for efficient graph traversal logic or mimic with Prisma
        // "Find Topic T where NOT EXISTS (Prereq P linked to T where P is NOT in UserMastery(userId, P) or Level < 100)"
        
        const nextTopics = await prisma.$queryRaw`
            SELECT t.*
            FROM "Topic" t
            WHERE NOT EXISTS (
                SELECT 1
                FROM "TopicDependency" td
                LEFT JOIN "UserMastery" um ON um."subtopicId" IN (
                    SELECT s.id FROM "Subtopic" s WHERE s."topicId" = td."fromTopicId"
                ) AND um."userId" = ${userId}
                WHERE td."toTopicId" = t.id
                AND (um.id IS NULL OR um.level < 100) 
            )
            AND NOT EXISTS (
                SELECT 1 
                FROM "Subtopic" s 
                JOIN "UserMastery" um ON um."subtopicId" = s.id 
                WHERE s."topicId" = t.id 
                AND um."userId" = ${userId} 
                AND um.level >= 100
            )
            LIMIT 5
        `;
        
        return nextTopics as any[];
    }
}
