import prisma from '../prisma';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('quiz-service');

export class QuizService {
    async startSession(userId: string, topicId: string) {
        // Create session logic, pick initial questions
        return { sessionId: 'mock-session-id', topicId };
    }

    async submitAnswer(userId: string, sessionId: string, questionId: string, answer: string) {
        try {
            // 1. Fetch Question
            const question = await prisma.quizQuestion.findUnique({ 
                where: { id: questionId },
                include: { quiz: true }
            });
            if (!question) throw new Error('Question not found');

            const isCorrect = question.correctAnswer === answer;

            // 2. Update Mastery
            // Assume question linked to a subtopic via Quiz -> Topic -> Subtopic 
            // Simplified: Finding related subtopic. Ideally Question has subtopicId
            const subtopic = await prisma.subtopic.findFirst({
                 where: { topicId: question.quiz.topicId || '' },
                 include: { topic: true }
            });
            
            // Upsert mastery
            if (subtopic) {
                const current = await prisma.userMastery.findUnique({
                    where: { userId_subtopicId: { userId, subtopicId: subtopic.id } }
                });
                
                const currentLevel = current?.level || 0;
                let change = isCorrect ? 5 : -5;
                const newLevel = Math.max(0, Math.min(100, currentLevel + change));
                
                await prisma.userMastery.upsert({
                    where: { userId_subtopicId: { userId, subtopicId: subtopic.id } },
                    update: { level: newLevel },
                    create: { userId, subtopicId: subtopic.id, level: newLevel }
                });
            }

            // 3. Adaptive Logic (Mock)
            // If correct streak..., fetch harder question
            const nextQuestion = isCorrect ? 'Harder Question ID' : 'Easier Question ID';
            
            return { isCorrect, nextQuestion };

        } catch (error) {
            logger.error('Quiz submission failed', error);
            throw error;
        }
    }
}
