import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';
import { GraphService } from './graph.service';

const logger = createLogger('study-plan-service');
const graphService = new GraphService();

export class StudyPlanService {
    async generateAdaptivePlan(userId: string, curriculumId: string, info: { targetDate: Date, dailyMinutes: number }) {
        try {
            // 1. Get Topics
            // In real logic, traverse graph. For MVP, getting all topics.
            const curriculum = await prisma.curriculum.findUnique({
                where: { id: curriculumId },
                include: { modules: { include: { topics: true } } }
            });

            if (!curriculum) throw new Error('Curriculum not found');

            // 2. Distribute Topics (Mock greedy algorithm)
            const schedule: any[] = [];
            let currentDate = new Date();
            let dailyLoad = 0;
            let currentDayTopics: any[] = [];

            for (const mod of curriculum.modules) {
                for (const topic of mod.topics) {
                    if (dailyLoad + topic.estimatedMinutes > info.dailyMinutes) {
                        schedule.push({
                            date: new Date(currentDate),
                            topics: currentDayTopics
                        });
                        currentDate.setDate(currentDate.getDate() + 1);
                        dailyLoad = 0;
                        currentDayTopics = [];
                    }
                    currentDayTopics.push(topic.id);
                    dailyLoad += topic.estimatedMinutes;
                }
            }

            // Push last day
            if (currentDayTopics.length > 0) {
                 schedule.push({
                    date: new Date(currentDate),
                    topics: currentDayTopics
                });
            }

            // 3. Save Plan
            const plan = await prisma.studyPlan.create({
                data: {
                    userId,
                    curriculumId,
                    startDate: new Date(),
                    targetDate: info.targetDate,
                    schedule: JSON.stringify(schedule)
                }
            });

            return plan;

        } catch (error) {
            logger.error('Error generating study plan', error);
            throw error;
        }
    }

    async evaluatePlanHealth(userId: string) {
        // Retrieve active plan and compare progress
        // Mock implementation
        return { status: 'ON_TRACK', deviation: 0 };
    }
}
