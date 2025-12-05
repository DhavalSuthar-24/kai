import kafkaClient from './kafka';
import { prisma } from './prisma';
import { createLogger } from '@shared/index';

const logger = createLogger('screenshot-processor');

export async function startScreenshotProcessor() {
  logger.info('Starting screenshot processor');
  
  // Listen to content-events topic for CONTENT_PROCESSED events
  await kafkaClient.consume('learning-service-screenshots', 'content-events', async (message: any) => {
    // Only process CONTENT_PROCESSED events (after OCR and AI analysis)
    if (message.type !== 'CONTENT_PROCESSED') return;
    
    const { captureId, userId, extractedText, topics } = message.data;
    
    logger.info(`Processing content for capture: ${captureId}, user: ${userId}`);
    
    try {
      // Step 1: Call AI service to categorize content
      const { services } = await import('@shared/index.ts');
      let suggestedTopic = 'General';
      let confidence = 0.5;
      let flashcardSuggestions: any[] = [];
      
      if (extractedText && extractedText.length > 50) {
        try {
          const aiResult = await services.ai.post<{
            category?: string;
            suggestedTopic?: string;
            confidence?: number;
            keywords?: string[];
          }>('/api/v1/content/categorize', {
            content: extractedText,
            includeKeywords: true
          });
          
          suggestedTopic = aiResult.suggestedTopic || 'General';
          confidence = aiResult.confidence || 0.5;
          
          logger.info(`AI categorization: ${suggestedTopic} (confidence: ${confidence})`);
        } catch (error) {
          logger.warn('AI categorization failed, using fallback', error);
        }
      }
      
      // Step 2: Auto-create topic if confidence is high enough
      let topic: any = null;
      if (confidence > 0.7) {
        // Check if topic already exists
        topic = await prisma.topic.findFirst({
          where: {
            userId,
            name: {
              contains: suggestedTopic,
              mode: 'insensitive'
            }
          }
        });
        
        // Create new topic if doesn't exist
        if (!topic) {
          topic = await prisma.topic.create({
            data: {
              userId,
              name: suggestedTopic,
              color: getRandomColor(),
              icon: getTopicIcon(suggestedTopic)
            }
          });
          
          logger.info(`Auto-created topic: ${topic.id} - ${topic.name}`);
          
          // Publish topic created event
          await kafkaClient.send('learning-events', [{
            type: 'TOPIC_CREATED',
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
              topicId: topic.id,
              userId,
              name: topic.name,
              autoCreated: true
            },
            metadata: {
              correlationId: message.metadata?.correlationId || crypto.randomUUID(),
              source: 'learning-service'
            }
          }]);
        }
      }
      
      // Step 3: Generate flashcards if we have a topic and enough content
      if (topic && extractedText && extractedText.length > 100) {
        try {
          // Call AI service to generate flashcards
          const flashcardsResult = await services.ai.post<{
            flashcards?: Array<{front: string, back: string}>
          }>('/api/v1/document/generate-flashcards', {
            content: extractedText,
            topicName: topic.name,
            count: 3
          });
          
          if (flashcardsResult.flashcards && flashcardsResult.flashcards.length > 0) {
            // Create flashcards in database
            for (const card of flashcardsResult.flashcards) {
              await prisma.flashcard.create({
                data: {
                  userId,
                  topicId: topic.id,
                  front: card.front,
                  back: card.back,
                  nextReview: new Date(),
                  interval: 1,
                  easeFactor: 2.5,
                  difficulty: 'NORMAL'
                }
              });
            }
            
            logger.info(`Generated ${flashcardsResult.flashcards.length} flashcards for topic ${topic.name}`);
            flashcardSuggestions = flashcardsResult.flashcards;
          }
        } catch (error) {
          logger.warn('Flashcard generation failed', error);
        }
      }
      
      // Step 4: Publish completion event
      await kafkaClient.send('learning-events', [{
        type: 'CONTENT_LEARNING_PROCESSED',
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          captureId,
          userId,
          topicId: topic?.id || null,
          topicName: topic?.name || null,
          flashcardsGenerated: flashcardSuggestions.length,
          confidence
        },
        metadata: {
          correlationId: message.metadata?.correlationId || crypto.randomUUID(),
          source: 'learning-service'
        }
      }]);
      
      logger.info(`Content processing complete for capture ${captureId}`);
    } catch (error) {
      logger.error(`Content processing failed for ${captureId}`, error);
    }
  });
  
  logger.info('📸 Screenshot Processor started');
}

// Helper functions
function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
  return colors[Math.floor(Math.random() * colors.length)] as string;
}

function getTopicIcon(topicName: string): string {
  const lowerName = topicName.toLowerCase();
  if (lowerName.includes('spanish') || lowerName.includes('language')) return '🗣️';
  if (lowerName.includes('programming') || lowerName.includes('code')) return '💻';
  if (lowerName.includes('math')) return '📐';
  if (lowerName.includes('science')) return '🔬';
  if (lowerName.includes('history')) return '📚';
  return '📝';
}
