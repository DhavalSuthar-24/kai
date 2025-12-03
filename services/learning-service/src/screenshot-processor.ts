import kafkaClient from './kafka';
import { prisma } from './prisma';
import { categorizeAndSummarize } from './services/ai.service';
import { createLogger } from '@shared/index';

const logger = createLogger('screenshot-processor');

interface ScreenshotEvent {
  captureId: string;
  userId: string;
  extractedText: string;
  confidence: number;
}

export async function startScreenshotProcessor() {
  await kafkaClient.consume('screenshot-processor', 'SCREENSHOT_UPLOADED', async (message: ScreenshotEvent) => {
    logger.info(`Processing screenshot: ${message.captureId}`);
    
    try {
      const { captureId, userId, extractedText, confidence } = message;

      if (!extractedText || extractedText.length < 10) {
        logger.warn(`Insufficient text extracted for ${captureId}`);
        return;
      }

      // Categorize and summarize using AI
      const aiResult = await categorizeAndSummarize(extractedText);

      // Try to find matching topic
      let topic = await prisma.topic.findFirst({
        where: {
          userId,
          name: {
            contains: aiResult.suggestedTopic,
            mode: 'insensitive'
          }
        }
      });

      // Auto-create topic if confidence is high and no match found
      if (!topic && aiResult.confidence > 0.7) {
        logger.info(`Auto-creating topic: ${aiResult.suggestedTopic} for user ${userId}`);
        
        topic = await prisma.topic.create({
          data: {
            userId,
            name: aiResult.suggestedTopic
          }
        });

        logger.info(`Topic created: ${topic.id} - ${topic.name}`);
      }

      // Publish processed event
      const wasTopicCreated = topic && aiResult.confidence > 0.7;
      await kafkaClient.send('SCREENSHOT_PROCESSED', [{
        captureId,
        userId,
        suggestedTopic: aiResult.suggestedTopic,
        confidence: aiResult.confidence,
        summary: aiResult.summary,
        keywords: aiResult.keywords,
        topicId: topic?.id || null,
        topicCreated: wasTopicCreated
      }]);

      logger.info(`Screenshot processed: ${captureId} -> ${aiResult.suggestedTopic}`);
    } catch (error) {
      logger.error('Screenshot processing failed', error);
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
