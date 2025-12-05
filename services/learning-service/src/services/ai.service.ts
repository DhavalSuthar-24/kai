import { services } from '@shared/index.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('ai-service');

export async function categorizeAndSummarize(content: string) {
  try {
    // Call real AI service for categorization and summarization
    const result = await services.ai.post<{
      category?: string;
      summary?: string;
      suggestedTopic?: string;
      confidence?: number;
      keywords?: string[];
    }>('/api/v1/content/categorize', {
      content,
      includeKeywords: true
    });
    
    return {
      category: result.category || 'General',
      summary: result.summary || content.substring(0, 100),
      suggestedTopic: result.suggestedTopic || 'General Topic',
      confidence: result.confidence || 0.7,
      keywords: result.keywords || []
    };
  } catch (error) {
    logger.error('AI service call failed, using fallback', error);
    
    // Fallback to basic categorization
    return {
      category: 'General',
      summary: content.substring(0, 100),
      suggestedTopic: 'General Topic',
      confidence: 0.5,
      keywords: []
    };
  }
}
