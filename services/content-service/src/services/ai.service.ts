import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('ai-service');

export interface AIAnalysisResult {
  category: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  importanceScore: number;
  entities: string[];
  summary: string;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async analyzeContent(text: string): Promise<AIAnalysisResult | null> {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
      const prompt = `
        Analyze the following text extracted from a screenshot or content capture.
        Return a JSON object with the following fields:
        - category: The most relevant category (e.g., PRODUCTIVITY, SOCIAL, NEWS, LEARNING, ENTERTAINMENT).
        - sentiment: One of POSITIVE, NEUTRAL, NEGATIVE.
        - importanceScore: A number between 0.0 and 1.0 indicating how "essential" or "valuable" this content is for long-term knowledge or productivity.
        - entities: An array of strings representing key people, places, concepts, or tools mentioned.
        - summary: A brief 1-sentence summary of the content.

        Text:
        "${text.substring(0, 10000)}" 
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Clean up markdown code blocks if present
      const jsonString = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      
      return JSON.parse(jsonString) as AIAnalysisResult;
    } catch (error) {
      logger.error('AI Analysis failed', error);
      return null;
    }
  }
}

export const aiService = new AIService();
