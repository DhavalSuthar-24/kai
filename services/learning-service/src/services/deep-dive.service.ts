import axios from 'axios';
import { createLogger, getConfig, errorResponse } from '@shared/index.ts';
import prisma from '../prisma';

const logger = createLogger('deep-dive-service');
const config = getConfig();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:3002'; // Verify port

export class DeepDiveService {
    async answerQuestion(userId: string, documentId: string, query: string) {
        try {
            // 1. Retrieve Relevant Chunks from Content Service
            // We use the internal service URL or passing a token if needed.
            // Assuming internal networking for now.
            
            const searchResponse = await axios.post(`${CONTENT_SERVICE_URL}/documents/search`, {
                documentId,
                query,
                k: 5
            });
            const chunks = searchResponse.data.data; // Array of DocumentChunk
            
            if (!chunks || chunks.length === 0) {
                return {
                    answer: "I couldn't find any relevant information in the document to answer your question.",
                    sources: []
                };
            }
            
            const contextChunks = chunks.map((c: any) => c.content);
            
            // 2. Synthesize Answer via AI Service
            const ragResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/rag/answer`, {
                query,
                context_chunks: contextChunks
            });
            
            const aiResult = ragResponse.data;
            
            // 3. Construct Final Response
            return {
                answer: aiResult.answer,
                sources: chunks.map((c: any) => ({
                    chunkId: c.id,
                    content: c.content.substring(0, 200) + '...',
                    pageNumber: c.pageNumber
                })),
                relatedTopics: aiResult.related_topics,
                suggestedQuestions: aiResult.suggested_questions
            };

        } catch (error: any) {
            logger.error('Deep Dive failed', error);
            throw new Error(error.message || 'Failed to generate answer');
        }
    }
}
