import { Server, Socket } from 'socket.io';
import { createLogger } from '@shared/index.ts';
import { QuizService } from '../services/quiz.service';

const logger = createLogger('quiz-socket');
const quizService = new QuizService();

export const initializeQuizSocket = (io: Server) => {
    const quizNamespace = io.of('/quiz');

    quizNamespace.on('connection', (socket: Socket) => {
        logger.info(`User connected to quiz: ${socket.id}`);

        socket.on('join_session', async ({ userId, topicId }) => {
            const session = await quizService.startSession(userId, topicId);
            socket.join(session.sessionId);
            socket.emit('session_started', session);
        });

        socket.on('submit_answer', async ({ userId, sessionId, questionId, answer }) => {
            const result = await quizService.submitAnswer(userId, sessionId, questionId, answer);
            socket.emit('answer_result', result);
        });

        socket.on('disconnect', () => {
            logger.info(`User disconnected from quiz: ${socket.id}`);
        });
    });
};
